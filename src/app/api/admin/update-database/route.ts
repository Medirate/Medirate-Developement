import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import * as XLSX from "xlsx";

/**
 * SERVICE LINE PROTECTION POLICY:
 * 
 * Service line fields (service_lines_impacted, service_lines_impacted_1, etc.) are:
 * 1. ✅ SET during initial creation of new entries
 * 2. 🛡️ PROTECTED from being overwritten during updates of existing entries
 * 3. 🔒 ONLY modifiable through the frontend edit interface when explicitly changed by users
 * 
 * This ensures that:
 * - Excel file updates don't overwrite manually curated service line data
 * - Service lines remain consistent across database updates
 * - Manual edits are preserved and not lost during automated processes
 */

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
  
  // Simple logging function that only stores to local array (console output)
  function log(message: string, type: string = 'info', phase: string = 'general') {
    const logEntry = { message, type, phase, timestamp: new Date().toISOString() };
    logs.push(logEntry);
    console.log(`[${phase}] ${message}`);
  }
  
  try {
    // SECURITY: Validate admin authentication and authorization
    const { validateAdminAuth } = await import("@/lib/admin-auth");
    const { user: adminUser, error: authError } = await validateAdminAuth();
    
    if (authError) {
      log('❌ Admin authentication failed', 'error', 'security');
      return authError;
    }
    
    log(`✅ Admin access validated for user: ${adminUser.email}`, 'success', 'security');
    
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
      const serviceColumnCounter = { count: 0 };
      
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toLowerCase();
        
        // Handle multiple SERVICE columns by adding counters
        if (cleanKey === 'service') {
          if (serviceColumnCounter.count === 0) {
            newRow['service'] = row[key];
          } else {
            newRow[`service ${serviceColumnCounter.count}`] = row[key];
          }
          serviceColumnCounter.count++;
        } else {
          newRow[cleanKey] = row[key];
        }
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
      // Map SERVICE columns to service_lines_impacted columns
      'service': 'service_lines_impacted',           // First SERVICE column
      'service 1': 'service_lines_impacted_1',       // Second SERVICE column  
      'service 2': 'service_lines_impacted_2',       // Third SERVICE column
      'service 3': 'service_lines_impacted_3',       // Fourth SERVICE column
      // Also support the full name variants
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
    log(`DEBUG: Latest sheet "${latestSheet}" contains ${filteredRows.length} entries after filtering`, 'info', 'parse');
    log(`Excel columns found: ${columns.join(', ')}`, 'info', 'parse');
    
    // Debug: Check for SERVICE columns specifically
    const serviceColumns = columns.filter(col => col.startsWith('service'));
    if (serviceColumns.length > 0) {
      log(`SERVICE columns detected: ${serviceColumns.join(', ')}`, 'info', 'parse');
    }
    
    // Debug: Show sample data from first row
    if (filteredRows.length > 0) {
      const sampleRow = filteredRows[0];
      const sampleFields = Object.keys(sampleRow).slice(0, 10);
      const sampleData = sampleFields.map(field => `${field}: "${sampleRow[field]}"`).join(', ');
      log(`DEBUG: Sample row data: ${sampleData}`, 'info', 'parse');
      
      if (sampleRow.url) {
        log(`DEBUG: Sample URL from Excel: "${sampleRow.url}"`, 'info', 'parse');
      }
    }

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
      log(`DEBUG: Database table "bill_track_50" contains ${dbRows?.length || 0} total entries`, 'info', 'fetch');
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
      
      // Debug: Show detailed comparison
      log(`DEBUG: ===== COMPARISON SUMMARY =====`, 'info', 'debug');
      log(`DEBUG: Excel sheet "${latestSheet}" has ${filteredRows.length} entries with URLs`, 'info', 'debug');
      log(`DEBUG: Database table "bill_track_50" has ${dbByUrl.size} entries with URLs`, 'info', 'debug');
      log(`DEBUG: Found ${newEntries.length} potentially NEW entries to insert`, 'info', 'debug');
      
      // Show sample URLs from Excel vs Database for comparison
      const excelUrls = filteredRows.slice(0, 5).map(r => r.url).filter(Boolean);
      const dbUrls = Array.from(dbByUrl.keys()).slice(0, 5);
      log(`DEBUG: Sample Excel URLs: ${excelUrls.join(', ')}`, 'info', 'debug');
      log(`DEBUG: Sample DB URLs: ${dbUrls.join(', ')}`, 'info', 'debug');
      
      if (newEntries.length > 0) {
        log(`DEBUG: First 3 new entry URLs: ${newEntries.slice(0, 3).map(r => r.url).join(', ')}`, 'info', 'debug');
      }
      // Define known columns that exist in bill_track_50 table
      const knownColumns = [
        'id', 'state', 'bill_number', 'name', 'last_action', 'action_date', 
        'sponsor_list', 'bill_progress', 'url', 'ai_summary', 'is_new', 
        'date_extracted', 'service_lines_impacted', 'service_lines_impacted_1', 
        'service_lines_impacted_2', 'service_lines_impacted_3'
      ];
      
      for (const entry of newEntries) {
        const insertObj = { ...entry, is_new: 'yes', date_extracted: today };
        delete insertObj.source_sheet;
        
        // Filter out unknown columns to prevent schema errors
        const filteredInsertObj: any = {};
        Object.keys(insertObj).forEach(key => {
          if (knownColumns.includes(key)) {
            filteredInsertObj[key] = insertObj[key];
          } else {
            log(`Skipping unknown column: ${key}`, 'info', 'insert');
          }
        });
        
        // Log the columns being inserted for debugging
        log(`Attempting to insert with columns: ${Object.keys(filteredInsertObj).join(', ')}`, 'info', 'insert');
        
        const { data, error } = await supabase.from('bill_track_50').insert([filteredInsertObj]);
        if (!error) {
          inserted.push(filteredInsertObj);
          log(`Inserted new entry: ${filteredInsertObj.url}`, 'success', 'insert');
        } else {
          log(`Failed to insert: ${filteredInsertObj.url} - ${error.message}`, 'error', 'insert');
          
          // If it's a column not found error, try to identify which column is causing issues
          if (error.message.includes('could not find') || error.message.includes('column')) {
            log(`Column error detected. Available columns in object: ${Object.keys(filteredInsertObj).join(', ')}`, 'error', 'insert');
          }
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
        // Service line fields that should NOT be overwritten for existing entries
        const protectedServiceLineFields = [
          'service_lines_impacted',
          'service_lines_impacted_1', 
          'service_lines_impacted_2',
          'service_lines_impacted_3'
        ];
        
        for (const col of columns) {
          if (col === 'source_sheet') continue;
          
          // Skip unknown columns
          if (!knownColumns.includes(col)) {
            log(`Skipping unknown column '${col}' in update for: ${entry.url}`, 'info', 'update');
            continue;
          }
          
          // Skip service line fields - don't overwrite them for existing entries
          if (protectedServiceLineFields.includes(col)) {
            log(`🛡️ PROTECTED: Skipping service line field '${col}' for existing entry: ${entry.url}`, 'info', 'update');
            log(`🛡️ Current value: "${dbRow[col] || 'NULL'}", Excel value: "${entry[col] || 'NULL'}"`, 'info', 'update');
            continue;
          }
          
          if ((entry[col] ?? "") !== (dbRow[col] ?? "")) {
            updateObj[col] = entry[col];
            changed = true;
          }
        }
        if (changed) {
          updateObj.is_new = 'yes';
          updateObj.date_extracted = today;
          
          log(`DEBUG: Updating entry ${entry.url} with changes: ${JSON.stringify(updateObj)}`, 'info', 'debug');
          
          const { data, error } = await supabase.from('bill_track_50').update(updateObj).eq('url', entry.url);
          if (!error) {
            updated.push({ url: entry.url, ...updateObj });
            log(`Updated entry: ${entry.url}`, 'success', 'update');
          } else {
            log(`Failed to update: ${entry.url} - ${error.message}`, 'error', 'update');
          }
        } else {
          // Debug: Show why no update was needed
          log(`DEBUG: No changes detected for entry: ${entry.url}`, 'info', 'debug');
        }
      }
      
      log(`DEBUG: ===== UPDATE SUMMARY =====`, 'info', 'debug');
      log(`DEBUG: Processed ${filteredRows.length} Excel entries for updates`, 'info', 'debug');
      log(`DEBUG: Found ${updated.length} entries that needed updates`, 'info', 'debug');
      log(`Updated ${updated.length} entries.`, 'success', 'update');
      
      // Log service line protection summary
      const totalServiceLineFields = filteredRows.length * 4; // 4 service line fields per entry
      log(`🛡️ SERVICE LINE PROTECTION: All ${totalServiceLineFields} service line fields were protected from overwriting`, 'success', 'protection');
      log(`🛡️ Service lines are only set during initial creation, never updated for existing entries`, 'info', 'protection');
      
      log(`DEBUG: ===== FINAL RESULTS =====`, 'info', 'debug');
      log(`DEBUG: Total inserted: ${inserted.length} new entries`, 'info', 'debug');
      log(`DEBUG: Total updated: ${updated.length} existing entries`, 'info', 'debug');
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
      // NOTE: Provider alerts currently only does inserts, no updates
      // Service line fields are preserved since we don't overwrite existing entries
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