import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode"); // New parameter to determine API mode

    // Handle fee schedule dates request
    if (mode === 'feeScheduleDates') {
      const state = searchParams.get("state");
      const serviceCategory = searchParams.get("serviceCategory");
      const serviceCode = searchParams.get("serviceCode");

      if (!state || !serviceCategory || !serviceCode) {
        return NextResponse.json({ dates: [] });
      }

      const query = `
        SELECT DISTINCT rate_effective_date
        FROM master_data_may_30_cleaned
        WHERE TRIM(UPPER(state_name)) = TRIM(UPPER($1))
          AND TRIM(UPPER(service_category)) = TRIM(UPPER($2))
          AND service_code = $3
        ORDER BY rate_effective_date DESC
      `;

      const result = await pool.query(query, [state, serviceCategory, serviceCode]);
      return NextResponse.json({ dates: result.rows.map(r => r.rate_effective_date) });
    }

    // If mode is 'filters', only return filter options
    if (mode === 'filters') {
      const serviceCategory = searchParams.get("serviceCategory");
      
      // Get all service categories
      const categoriesQuery = "SELECT DISTINCT service_category FROM master_data_may_30_cleaned ORDER BY service_category";
      const categoriesResult = await pool.query(categoriesQuery);
      
      // Get states (filtered by service category if provided)
      let statesQuery = "SELECT DISTINCT state_name FROM master_data_may_30_cleaned";
      const statesParams: any[] = [];
      
      if (serviceCategory) {
        statesQuery += " WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))";
        statesParams.push(serviceCategory);
      }
      statesQuery += " ORDER BY state_name";
      
      const statesResult = await pool.query(statesQuery, statesParams);

      return NextResponse.json({
        filterOptions: {
          serviceCategories: categoriesResult.rows.map(r => r.service_category).filter(Boolean).sort(),
          states: statesResult.rows.map(r => r.state_name).filter(Boolean).sort()
        }
      });
    }

    // For data mode, get all filters
    const serviceCategory = searchParams.get("serviceCategory");
    const state = searchParams.get("state");
    const serviceCode = searchParams.get("serviceCode");
    const serviceDescription = searchParams.get("serviceDescription");
    const program = searchParams.get("program");
    const locationRegion = searchParams.get("locationRegion");
    const modifier = searchParams.get("modifier");
    const providerType = searchParams.get("providerType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const itemsPerPage = parseInt(searchParams.get("itemsPerPage") || "50");

    // Debug logging
    console.log('API received state:', state);

    // Build the WHERE clause for data query
    const whereClause = [];
    const params: any[] = [];

    if (serviceCategory) {
      whereClause.push(`TRIM(UPPER(service_category)) = TRIM(UPPER($${params.length + 1}))`);
      params.push(serviceCategory);
    }

    if (state) {
      whereClause.push(`TRIM(UPPER(state_name)) = TRIM(UPPER($${params.length + 1}))`);
      params.push(state);
    }

    if (serviceCode) {
      whereClause.push(`service_code = $${params.length + 1}`);
      params.push(serviceCode);
    }

    if (serviceDescription) {
      whereClause.push(`service_description = $${params.length + 1}`);
      params.push(serviceDescription);
    }

    if (program) {
      whereClause.push(`program = $${params.length + 1}`);
      params.push(program);
    }

    if (locationRegion) {
      whereClause.push(`location_region = $${params.length + 1}`);
      params.push(locationRegion);
    }

    if (providerType) {
      whereClause.push(`provider_type = $${params.length + 1}`);
      params.push(providerType);
    }

    if (modifier) {
      whereClause.push(`(
        modifier_1 = $${params.length + 1} OR 
        modifier_2 = $${params.length + 1} OR 
        modifier_3 = $${params.length + 1} OR 
        modifier_4 = $${params.length + 1}
      )`);
      params.push(modifier);
    }

    if (startDate && endDate) {
      whereClause.push(`rate_effective_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(startDate, endDate);
    }

    // Construct the base queries for data
    let dataQuery = "SELECT * FROM master_data_may_30_cleaned";

    // Add WHERE clause if we have any conditions
    if (whereClause.length > 0) {
      dataQuery += " WHERE " + whereClause.join(" AND ");
    }

    // Add ordering
    dataQuery += " ORDER BY state_name ASC, service_code ASC";

    // Add pagination
    const offset = (page - 1) * itemsPerPage;
    dataQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(itemsPerPage, offset);

    // Debug logging
    console.log('Data query:', dataQuery);
    console.log('Params:', params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM master_data_may_30_cleaned ${
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : ""
    }`;
    const countResult = await pool.query(countQuery, params.slice(0, -2)); // Remove pagination params for count

    // Execute data query
    const dataResult = await pool.query(dataQuery, params);

    // Get filter options for the current data set
    const filterQueries = {
      serviceCodes: `SELECT ARRAY_AGG(DISTINCT service_code) as service_codes FROM master_data_may_30_cleaned ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}`,
      serviceDescriptions: `SELECT ARRAY_AGG(DISTINCT service_description) as service_descriptions FROM master_data_may_30_cleaned ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}`,
      programs: `SELECT ARRAY_AGG(DISTINCT program) as programs FROM master_data_may_30_cleaned ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}`,
      locationRegions: `SELECT ARRAY_AGG(DISTINCT location_region) as location_regions FROM master_data_may_30_cleaned ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}`,
      providerTypes: `SELECT ARRAY_AGG(DISTINCT provider_type) as provider_types FROM master_data_may_30_cleaned ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}`,
      modifiers: `SELECT 
        ARRAY_AGG(DISTINCT 
          CASE 
            WHEN modifier_1 IS NOT NULL AND modifier_1 <> '' THEN 
              CASE WHEN modifier_1_details IS NOT NULL AND modifier_1_details <> '' THEN modifier_1 || ' - ' || modifier_1_details ELSE modifier_1 END
            ELSE NULL END
        ) ||
        ARRAY_AGG(DISTINCT 
          CASE 
            WHEN modifier_2 IS NOT NULL AND modifier_2 <> '' THEN 
              CASE WHEN modifier_2_details IS NOT NULL AND modifier_2_details <> '' THEN modifier_2 || ' - ' || modifier_2_details ELSE modifier_2 END
            ELSE NULL END
        ) ||
        ARRAY_AGG(DISTINCT 
          CASE 
            WHEN modifier_3 IS NOT NULL AND modifier_3 <> '' THEN 
              CASE WHEN modifier_3_details IS NOT NULL AND modifier_3_details <> '' THEN modifier_3 || ' - ' || modifier_3_details ELSE modifier_3 END
            ELSE NULL END
        ) ||
        ARRAY_AGG(DISTINCT 
          CASE 
            WHEN modifier_4 IS NOT NULL AND modifier_4 <> '' THEN 
              CASE WHEN modifier_4_details IS NOT NULL AND modifier_4_details <> '' THEN modifier_4 || ' - ' || modifier_4_details ELSE modifier_4 END
            ELSE NULL END
        )
        as modifiers
        FROM master_data_may_30_cleaned ${whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : ''}`
    };

    const filterResults = await Promise.all([
      pool.query(filterQueries.serviceCodes, params.slice(0, -2)),
      pool.query(filterQueries.serviceDescriptions, params.slice(0, -2)),
      pool.query(filterQueries.programs, params.slice(0, -2)),
      pool.query(filterQueries.locationRegions, params.slice(0, -2)),
      pool.query(filterQueries.providerTypes, params.slice(0, -2)),
      pool.query(filterQueries.modifiers, params.slice(0, -2))
    ]);

    // Flatten and deduplicate modifiers, remove null/empty
    const rawModifiers: string[] = ((filterResults[5].rows[0].modifiers || []) as string[]).filter(Boolean);
    const uniqueModifiers = Array.from(new Set(rawModifiers)).filter(Boolean).map((mod) => ({ value: mod, label: mod }));

    return NextResponse.json({
      data: dataResult.rows,
      totalCount: parseInt(countResult.rows[0].count),
      currentPage: page,
      itemsPerPage,
      filterOptions: {
        serviceCodes: filterResults[0].rows[0].service_codes?.filter(Boolean).sort() || [],
        serviceDescriptions: filterResults[1].rows[0].service_descriptions?.filter(Boolean).sort() || [],
        programs: filterResults[2].rows[0].programs?.filter(Boolean).sort() || [],
        locationRegions: filterResults[3].rows[0].location_regions?.filter(Boolean).sort() || [],
        providerTypes: filterResults[4].rows[0].provider_types?.filter(Boolean).sort() || [],
        modifiers: uniqueModifiers
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching state payment comparison data:", error.message, error.stack);
    } else {
      console.error("Unknown error occurred:", error);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
