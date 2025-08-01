import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import * as XLSX from "xlsx";

// Helper to get env vars safely
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// Get the current working file name (always the same)
function getCurrentFileName(): string {
  return "Medicaid Rates bill sheet with categories.xlsx";
}

// Check if the current file exists in Azure Blob Storage
async function findCurrentFile(blobServiceClient: BlobServiceClient, containerName: string): Promise<string> {
  const fileName = getCurrentFileName();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(fileName);
  const exists = await blobClient.exists();
  if (exists) {
    return fileName;
  }
  throw new Error(`File not found: ${fileName}`);
}

// Helper to read a Node.js Readable stream into a Buffer
async function toBufferFromStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const logs: { message: string; type: string; phase: string }[] = [];
  function log(message: string, type: string = 'info', phase: string = 'general') {
    logs.push({ message, type, phase });
  }
  try {
    // Get env vars
    const AZURE_CONNECTION_STRING = getEnv("AZURE_CONNECTION_STRING");
    const CONTAINER_NAME = getEnv("CONTAINER_NAME");
    const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE = getEnv("SUPABASE_SERVICE_ROLE");

    // Get type param (default to 'billtrack')
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'billtrack';

    log('Connecting to Azure Blob Storage...', 'info', 'connection');
    // Connect to Azure Blob Storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
    log('Azure Blob Storage connection successful.', 'success', 'connection');

    // Find the current working file
    log('Searching for current Excel file in Azure Blob Storage...', 'info', 'download');
    const fileName = await findCurrentFile(blobServiceClient, CONTAINER_NAME);
    log(`Found file: ${fileName}`, 'success', 'download');

    // Download the file to memory
    log('Downloading file from Azure Blob Storage...', 'info', 'download');
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlobClient(fileName);
    const downloadBlockBlobResponse = await blobClient.download();
    const stream = downloadBlockBlobResponse.readableStreamBody;
    if (!stream) throw new Error("Failed to get file stream from blob");
    const buffer = await toBufferFromStream(stream as any);
    const fileSize = buffer.length;
    log(`Downloaded file (${fileSize} bytes)`, 'success', 'download');

    // Parse the Excel file
    log('Parsing Excel file...', 'info', 'parse');
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const allSheetNames = workbook.SheetNames;
    // Filter sheets matching MMDDYY (6 digits)
    const dateSheets = allSheetNames.filter(name => /^\d{6}$/.test(name));
    if (dateSheets.length === 0) throw new Error("No sheets found in MMDDYY format");
    // Sort descending (latest first)
    dateSheets.sort((a, b) => b.localeCompare(a));
    const latestSheet = dateSheets[0];
    log(`Using latest sheet: ${latestSheet}`, 'success', 'parse');

    // Read the latest sheet
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[latestSheet], { defval: "" });
    // Lowercase and trim column names
    const rows = rawRows.map((row: any) => {
      const newRow: any = {};
      Object.keys(row).forEach(key => {
        newRow[key.trim().toLowerCase()] = row[key];
      });
      return newRow;
    });
    // Map Excel columns to DB columns
    const columnMap: Record<string, string> = {
      'action date': 'action_date',
      'bill number': 'bill_number',
      'ai summary': 'ai_summary',
      'bill progress': 'bill_progress',
      'last action': 'last_action',
      'sponsor list': 'sponsor_list',
      'service lines impacted': 'service_lines_impacted',
      'service lines impacted 1': 'service_lines_impacted_1',
      'service lines impacted 2': 'service_lines_impacted_2',
      'service lines impacted 3': 'service_lines_impacted_3',
    };
    function mapToDbColumns(obj: any) {
      const mapped: any = {};
      for (const key in obj) {
        if (columnMap[key]) {
          mapped[columnMap[key]] = obj[key];
        } else {
          mapped[key] = obj[key];
        }
      }
      return mapped;
    }
    // Add source_sheet column
    rows.forEach(r => (r.source_sheet = latestSheet));
    // Remove rows where url contains '** Data provided by www.BillTrack50.com **'
    const filteredRows = rows.filter(r =>
      !(typeof r.url === "string" && r.url.includes("** Data provided by www.BillTrack50.com **"))
    ).map(mapToDbColumns);
    // Get columns
    const columns = filteredRows.length > 0 ? Object.keys(filteredRows[0]) : [];
    log(`Parsed ${filteredRows.length} rows from sheet.`, 'success', 'parse');

    // --- Supabase client ---
    log('Connecting to Supabase...', 'info', 'connection');
    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();
    log('Supabase connection successful.', 'success', 'connection');

    if (type === 'billtrack') {
      // 1. Reset all is_new flags to 'no' in both tables
      log('Resetting is_new flags in bill_track_50...', 'info', 'reset');
      await supabase.from('bill_track_50').update({ is_new: 'no' }).neq('is_new', 'no');
      log('Resetting is_new flags in provider_alerts...', 'info', 'reset');
      const { error: resetError } = await supabase.from('provider_alerts').update({ is_new: 'no' }).neq('id', null);
      if (resetError) {
        log(`Error resetting is_new flags in provider_alerts: ${resetError.message}`, 'error', 'reset');
      } else {
        log(`Reset is_new flags in provider_alerts. Update attempted for all rows.`, 'success', 'reset');
      }
      log('is_new flags reset in both tables.', 'success', 'reset');

      // 2. Fetch all rows from bill_track_50
      log('Fetching all rows from bill_track_50...', 'info', 'fetch');
      const { data: dbRows, error: dbError } = await supabase.from('bill_track_50').select('*');
      if (dbError) {
        log(`Supabase fetch error: ${dbError.message}`, 'error', 'fetch');
        throw new Error(`Supabase fetch error: ${dbError.message}`);
      }
      log(`Fetched ${dbRows?.length || 0} rows from bill_track_50.`, 'success', 'fetch');
      const dbRowsClean = (dbRows || []).map((row: any) => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          newRow[key.trim().toLowerCase()] = row[key];
        });
        return newRow;
      });
      const dbByUrl = new Map<string, any>();
      dbRowsClean.forEach(r => {
        if (r.url) dbByUrl.set(r.url, r);
      });
      // 3. Insert new entries
      const today = new Date().toISOString().slice(0, 10);
      const newEntries = filteredRows.filter(r => r.url && !dbByUrl.has(r.url));
      let inserted = [];
      for (const entry of newEntries) {
        const insertObj = { ...entry, is_new: 'yes', date_extracted: today };
        delete insertObj.source_sheet;
        const { data, error } = await supabase.from('bill_track_50').insert([insertObj]);
        if (!error) {
          inserted.push(insertObj);
          log(`Inserted new entry: ${insertObj.url}`, 'success', 'insert');
        } else {
          log(`Failed to insert: ${insertObj.url} - ${error.message}`, 'error', 'insert');
        }
      }
      log(`Inserted ${inserted.length} new entries.`, 'success', 'insert');
      // 4. Update changed entries
      const updated: any[] = [];
      for (const entry of filteredRows) {
        if (!entry.url || !dbByUrl.has(entry.url)) continue;
        const dbRow = dbByUrl.get(entry.url);
        let changed = false;
        const updateObj: any = {};
        for (const col of columns) {
          if (col === 'source_sheet') continue;
          if ((entry[col] ?? "") !== (dbRow[col] ?? "")) {
            updateObj[col] = entry[col];
            changed = true;
          }
        }
        if (changed) {
          updateObj.is_new = 'yes';
          updateObj.date_extracted = today;
          const { data, error } = await supabase.from('bill_track_50').update(updateObj).eq('url', entry.url);
          if (!error) {
            updated.push({ url: entry.url, ...updateObj });
            log(`Updated entry: ${entry.url}`, 'success', 'update');
          } else {
            log(`Failed to update: ${entry.url} - ${error.message}`, 'error', 'update');
          }
        }
      }
      log(`Updated ${updated.length} entries.`, 'success', 'update');
      return NextResponse.json({
        success: true,
        fileName,
        fileSize,
        latestSheet,
        insertedCount: inserted.length,
        updatedCount: updated.length,
        insertedPreview: inserted.slice(0, 5),
        updatedPreview: updated.slice(0, 5),
        logs,
        message: `Updated bill_track_50: ${inserted.length} inserted, ${updated.length} updated.`
      });
    }
    if (type === 'provider_alerts') {
      // 1. Reset is_new flags in provider_alerts and bill_track_50
      log('Resetting is_new flags in provider_alerts...', 'info', 'reset');
      const { error: resetError } = await supabase.from('provider_alerts').update({ is_new: 'no' }).neq('id', null);
      if (resetError) {
        log(`Error resetting is_new flags in provider_alerts: ${resetError.message}`, 'error', 'reset');
      } else {
        log(`Reset is_new flags in provider_alerts. Update attempted for all rows.`, 'success', 'reset');
      }
      log('Resetting is_new flags in bill_track_50...', 'info', 'reset');
      await supabase.from('bill_track_50').update({ is_new: 'no' }).neq('is_new', 'no');
      log('is_new flags reset in both tables.', 'success', 'reset');

      // 2. Download the provider alerts file (separate from bill track file)
      log('Downloading provider alerts file...', 'info', 'download');
      const providerFileName = "provideralerts_data.xlsx";
      const providerContainerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      const providerBlobClient = providerContainerClient.getBlobClient(providerFileName);
      const providerDownloadResponse = await providerBlobClient.download();
      const providerStream = providerDownloadResponse.readableStreamBody;
      if (!providerStream) throw new Error("Failed to get provider alerts file stream from blob");
      const providerBuffer = await toBufferFromStream(providerStream as any);
      log(`Downloaded provider alerts file (${providerBuffer.length} bytes)`, 'success', 'download');

      // 3. Parse provider alerts Excel file
      log('Parsing provider alerts Excel file...', 'info', 'parse');
      const providerWorkbook = XLSX.read(providerBuffer, { type: "buffer" });
      const providerSheetName = 'provideralerts_data';
      if (!providerWorkbook.SheetNames.includes(providerSheetName)) {
        throw new Error(`Provider alerts sheet '${providerSheetName}' not found in file`);
      }
      log(`Using provider alerts sheet: ${providerSheetName}`, 'success', 'parse');
      
      const rawProviderRows = XLSX.utils.sheet_to_json(providerWorkbook.Sheets[providerSheetName], { defval: "" });
      // Lowercase and trim column names, replace spaces with underscores
      const providerRows = rawProviderRows.map((row: any) => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          newRow[cleanKey] = row[key];
        });
        return newRow;
      });
      
      // Map Excel columns to DB columns for provider_alerts
      const providerColumnMap: Record<string, string> = {
        'id': 'id',
        'link': 'link',
        'state': 'state',
        'subject': 'subject',
        'service_lines_impacted': 'service_lines_impacted',
        'service_lines_impacted_1': 'service_lines_impacted_1',
        'service_lines_impacted_2': 'service_lines_impacted_2',
        'service_lines_impacted_3': 'service_lines_impacted_3',
        'summary': 'summary',
        'announcement date': 'announcement_date',
        'announcement_date': 'announcement_date',
      };
      
      function mapProviderToDbColumns(obj: any) {
        const mapped: any = {};
        for (const excelKey in providerColumnMap) {
          const dbKey = providerColumnMap[excelKey];
          // Find the Excel key in obj (case-insensitive, trim)
          const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === excelKey);
          if (foundKey !== undefined) {
            mapped[dbKey] = obj[foundKey];
          } else if (dbKey === 'service_lines_impacted_3') {
            mapped[dbKey] = null;
          } else {
            mapped[dbKey] = "";
          }
        }
        return mapped;
      }
      // Helper to clean out __empty and empty keys
      function cleanRow(row: any) {
        const cleaned: any = {};
        Object.keys(row).forEach(key => {
          if (
            key &&
            key.trim() !== '' &&
            !key.toLowerCase().startsWith('__empty')
          ) {
            cleaned[key] = row[key];
          }
        });
        return cleaned;
      }
      const mappedProviderRows = providerRows.map(mapProviderToDbColumns);
      const cleanedProviderRows = mappedProviderRows.map(cleanRow);
      log(`Parsed ${mappedProviderRows.length} rows from provider alerts sheet.`, 'success', 'parse');

      // 3. Fetch all rows from provider_alerts
      log('Fetching all rows from provider_alerts...', 'info', 'fetch');
      const { data: dbProviderRows, error: dbProviderError } = await supabase.from('provider_alerts').select('*');
      if (dbProviderError) {
        log(`Supabase fetch error: ${dbProviderError.message}`, 'error', 'fetch');
        throw new Error(`Supabase fetch error: ${dbProviderError.message}`);
      }
      log(`Fetched ${dbProviderRows?.length || 0} rows from provider_alerts.`, 'success', 'fetch');
      const dbById = new Map<string, any>();
      (dbProviderRows || []).forEach(r => {
        // Use Excel ID as unique identifier
        if (r.id) dbById.set(r.id.toString(), r);
      });
      
      // Debug logging
      log(`Database has ${dbById.size} entries with IDs: ${Array.from(dbById.keys()).slice(0, 10).join(', ')}${dbById.size > 10 ? '...' : ''}`, 'info', 'debug');
      
      const excelIds = cleanedProviderRows.map(r => r.id).filter(id => id).slice(0, 10);
      log(`Excel has ${cleanedProviderRows.length} entries, first 10 IDs: ${excelIds.join(', ')}`, 'info', 'debug');
      
      // 4. Insert new entries (BATCHED)
      const today = new Date().toISOString().slice(0, 10);
      // Only process entries that have valid, non-empty IDs
      const validEntries = cleanedProviderRows.filter(r => r.id && r.id.toString().trim() !== '');
      const newEntries = validEntries.filter(r => !dbById.has(r.id.toString()));
      
      log(`Found ${validEntries.length} entries with valid IDs out of ${cleanedProviderRows.length} total`, 'info', 'debug');
      log(`Skipped ${cleanedProviderRows.length - validEntries.length} entries with empty/missing IDs`, 'warning', 'debug');
      
      log(`Found ${newEntries.length} entries that appear to be new out of ${cleanedProviderRows.length} total`, 'info', 'debug');
      if (newEntries.length > 0) {
        log(`First few 'new' entry IDs: ${newEntries.slice(0, 5).map(r => r.id).join(', ')}`, 'info', 'debug');
      }
      
      // Check for duplicate IDs within the Excel file itself
      const excelIdSet = new Set();
      const duplicateIds = new Set();
      cleanedProviderRows.forEach(r => {
        if (r.id) {
          const idStr = r.id.toString();
          if (excelIdSet.has(idStr)) {
            duplicateIds.add(idStr);
          } else {
            excelIdSet.add(idStr);
          }
        }
      });
      
      if (duplicateIds.size > 0) {
        log(`Warning: Found duplicate IDs in Excel file: ${Array.from(duplicateIds).join(', ')}`, 'warning', 'parse');
      }
      
      // Remove entries with duplicate IDs from newEntries
      const finalNewEntries = newEntries.filter(r => !duplicateIds.has(r.id?.toString()));
      
      if (finalNewEntries.length !== newEntries.length) {
        log(`Removed ${newEntries.length - finalNewEntries.length} entries with duplicate IDs`, 'warning', 'insert');
      }
      
      let inserted = [];
      if (finalNewEntries.length > 0) {
        // Include all columns including id for new insertions
        const batchToInsert = finalNewEntries.map((entry, index) => {
          const obj = { ...entry, is_new: 'yes' };
          return obj;
        });
        
        // Log what we're about to insert
        log(`Attempting to insert ${batchToInsert.length} new entries with IDs: ${batchToInsert.map(e => e.id).join(', ')}`, 'info', 'insert');
        
        const { data, error } = await supabase.from('provider_alerts').insert(batchToInsert);
        if (!error) {
          inserted = batchToInsert;
          batchToInsert.forEach(obj => {
            log(`Inserted new entry: ${obj.subject || obj.link || 'Unknown'}`, 'success', 'insert');
          });
        } else {
          log(`Failed to batch insert: ${error.message}`, 'error', 'insert');
          log(`Error details: ${JSON.stringify(error)}`, 'error', 'insert');
          
          // Try inserting one by one to identify the problematic entry
          log(`Attempting individual inserts to identify problematic entry...`, 'info', 'insert');
          for (const entry of batchToInsert) {
            const { error: singleError } = await supabase.from('provider_alerts').insert([entry]);
            if (singleError) {
              log(`Failed to insert entry with ID ${entry.id}: ${singleError.message}`, 'error', 'insert');
            } else {
              inserted.push(entry);
              log(`Successfully inserted entry with ID ${entry.id}`, 'success', 'insert');
            }
          }
        }
      }
      log(`Inserted ${inserted.length} new entries.`, 'success', 'insert');
      return NextResponse.json({
        success: true,
        fileName: providerFileName,
        fileSize: providerBuffer.length,
        providerSheetName,
        insertedCount: inserted.length,
        updatedCount: 0,
        insertedPreview: inserted.slice(0, 5),
        updatedPreview: [],
        logs,
        message: `Updated provider_alerts: ${inserted.length} inserted, 0 updated.`
      });
    }

    return NextResponse.json({
      success: false,
      logs,
      message: 'Unknown update type.'
    }, { status: 400 });
  } catch (error: any) {
    logs.push({ message: error.message, type: 'error', phase: 'error' });
    return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 });
  }
} 