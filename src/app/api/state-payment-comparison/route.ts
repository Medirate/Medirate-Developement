import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function GET(request: Request) {
  try {
    // Validate authentication
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    
    if (!user || !user.email) {
      console.log('❌ Unauthorized API access attempt');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('✅ Authenticated API request from:', user.email);

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
      const state = searchParams.get("state");
      const serviceCode = searchParams.get("serviceCode");
      
      // Get all service categories (only if not filtering by state)
      let categoriesQuery = "SELECT DISTINCT service_category FROM master_data_may_30_cleaned";
      if (state) {
        categoriesQuery += " WHERE TRIM(UPPER(state_name)) = TRIM(UPPER($1))";
      }
      categoriesQuery += " ORDER BY service_category";
      const categoriesResult = await pool.query(categoriesQuery, state ? [state] : []);
      
      // Get states (filtered by service category if provided)
      let statesQuery = "SELECT DISTINCT state_name FROM master_data_may_30_cleaned";
      const statesParams: any[] = [];
      
      if (serviceCategory) {
        statesQuery += " WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))";
        statesParams.push(serviceCategory);
      }
      statesQuery += " ORDER BY state_name";
      
      const statesResult = await pool.query(statesQuery, statesParams);

      // Get service codes if both service category and state are provided
      let serviceCodes: string[] = [];
      let otherFilterOptions = {
        programs: [] as string[],
        locationRegions: [] as string[],
        providerTypes: [] as string[],
        serviceDescriptions: [] as string[],
        modifiers: [] as { value: string; label: string }[],
        feeScheduleDates: [] as string[],
        data: [] as any[]
      };

      // --- ADDED: If serviceCategory is provided but no state, get all codes for the category ---
      if (serviceCategory && !state) {
        const allCodesQuery = `
          SELECT DISTINCT service_code
          FROM master_data_may_30_cleaned
          WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
          ORDER BY service_code
        `;
        const allCodesResult = await pool.query(allCodesQuery, [serviceCategory]);
        serviceCodes = allCodesResult.rows.map(r => r.service_code).filter(Boolean);
      }
      // --- END ADDED ---

      if (serviceCategory && state) {
        // Base query for filtering
        let baseWhereClause = `
          WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
            AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
        `;
        const baseParams = [serviceCategory, state];

        // If service code is provided, add it to the filter
        if (serviceCode) {
          baseWhereClause += ` AND service_code = $${baseParams.length + 1}`;
          baseParams.push(serviceCode);
        }

        // Get service codes
        const serviceCodesQuery = `
          SELECT DISTINCT service_code 
          FROM master_data_may_30_cleaned 
          ${baseWhereClause}
          ORDER BY service_code
        `;

        // Debug logging
        console.log('Service codes query:', serviceCodesQuery);
        console.log('Base params:', baseParams);

        const serviceCodesResult = await pool.query(serviceCodesQuery, baseParams);
        serviceCodes = serviceCodesResult.rows.map(r => r.service_code).filter(Boolean);

        // Also get service descriptions for the state + category combination (without service code filter)
        const serviceDescriptionsQuery = `
          SELECT DISTINCT service_description 
          FROM master_data_may_30_cleaned 
          WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
            AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
            AND service_description IS NOT NULL 
            AND service_description != ''
          ORDER BY service_description
        `;
        
        const serviceDescriptionsResult = await pool.query(serviceDescriptionsQuery, [serviceCategory, state]);
        otherFilterOptions.serviceDescriptions = serviceDescriptionsResult.rows.map(r => r.service_description).filter(Boolean);

        // Also preload other filter options for this state + category combination
        const otherFiltersQueries = {
          programs: `
            SELECT DISTINCT program 
            FROM master_data_may_30_cleaned 
            WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
              AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
              AND program IS NOT NULL 
              AND program != ''
            ORDER BY program
          `,
          locationRegions: `
            SELECT DISTINCT location_region 
            FROM master_data_may_30_cleaned 
            WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
              AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
              AND location_region IS NOT NULL 
              AND location_region != ''
            ORDER BY location_region
          `,
          providerTypes: `
            SELECT DISTINCT provider_type 
            FROM master_data_may_30_cleaned 
            WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
              AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
              AND provider_type IS NOT NULL 
              AND provider_type != ''
            ORDER BY provider_type
          `,
          modifiers: `
            WITH modifier_data AS (
              SELECT 
                CASE 
                  WHEN modifier_1 IS NOT NULL AND modifier_1 != '' THEN 
                    CASE WHEN modifier_1_details IS NOT NULL AND modifier_1_details != '' 
                      THEN modifier_1 || ' - ' || modifier_1_details 
                      ELSE modifier_1 
                    END
                  ELSE NULL 
                END as modifier
              FROM master_data_may_30_cleaned 
              WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                AND modifier_1 IS NOT NULL 
                AND modifier_1 != ''
              UNION
              SELECT 
                CASE 
                  WHEN modifier_2 IS NOT NULL AND modifier_2 != '' THEN 
                    CASE WHEN modifier_2_details IS NOT NULL AND modifier_2_details != '' 
                      THEN modifier_2 || ' - ' || modifier_2_details 
                      ELSE modifier_2 
                    END
                  ELSE NULL 
                END
              FROM master_data_may_30_cleaned 
              WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                AND modifier_2 IS NOT NULL 
                AND modifier_2 != ''
              UNION
              SELECT 
                CASE 
                  WHEN modifier_3 IS NOT NULL AND modifier_3 != '' THEN 
                    CASE WHEN modifier_3_details IS NOT NULL AND modifier_3_details != '' 
                      THEN modifier_3 || ' - ' || modifier_3_details 
                      ELSE modifier_3 
                    END
                  ELSE NULL 
                END
              FROM master_data_may_30_cleaned 
              WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                AND modifier_3 IS NOT NULL 
                AND modifier_3 != ''
              UNION
              SELECT 
                CASE 
                  WHEN modifier_4 IS NOT NULL AND modifier_4 != '' THEN 
                    CASE WHEN modifier_4_details IS NOT NULL AND modifier_4_details != '' 
                      THEN modifier_4 || ' - ' || modifier_4_details 
                      ELSE modifier_4 
                    END
                  ELSE NULL 
                END
              FROM master_data_may_30_cleaned 
              WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                AND modifier_4 IS NOT NULL 
                AND modifier_4 != ''
            )
            SELECT DISTINCT modifier 
            FROM modifier_data 
            WHERE modifier IS NOT NULL 
            ORDER BY modifier
          `
        };

        // Don't load other filter options initially - they'll be loaded when service code/description is selected
        // This prevents timeout issues with large datasets
        console.log('Skipping other filter options for now to prevent timeout');

        // If service code is selected, get all other filter options and data
        if (serviceCode) {
          try {
            // Debug logging for input parameters
            console.log('Filtering with:', {
              serviceCategory,
              state,
              serviceCode,
              baseWhereClause,
              baseParams
            });

            // Get all other filter options with simplified queries first
            const filterQueries = {
              programs: `
                SELECT DISTINCT program 
                FROM master_data_may_30_cleaned 
                WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                  AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                  AND service_code = $3
                  AND program IS NOT NULL 
                  AND program != ''
                ORDER BY program
              `,
              locationRegions: `
                SELECT DISTINCT location_region 
                FROM master_data_may_30_cleaned 
                WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                  AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                  AND service_code = $3
                  AND location_region IS NOT NULL 
                  AND location_region != ''
                ORDER BY location_region
              `,
              providerTypes: `
                SELECT DISTINCT provider_type 
                FROM master_data_may_30_cleaned 
                WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                  AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                  AND service_code = $3
                  AND provider_type IS NOT NULL 
                  AND provider_type != ''
                ORDER BY provider_type
              `,
              serviceDescriptions: `
                SELECT DISTINCT service_description 
                FROM master_data_may_30_cleaned 
                WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                  AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                  AND service_code = $3
                  AND service_description IS NOT NULL 
                  AND service_description != ''
                ORDER BY service_description
              `,
              modifiers: `
                WITH modifier_data AS (
                  SELECT 
                    CASE 
                      WHEN modifier_1 IS NOT NULL AND modifier_1 != '' THEN 
                        CASE WHEN modifier_1_details IS NOT NULL AND modifier_1_details != '' 
                          THEN modifier_1 || ' - ' || modifier_1_details 
                          ELSE modifier_1 
                        END
                      ELSE NULL 
                    END as modifier
                  FROM master_data_may_30_cleaned 
                  WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                    AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                    AND service_code = $3
                    AND modifier_1 IS NOT NULL 
                    AND modifier_1 != ''
                  UNION
                  SELECT 
                    CASE 
                      WHEN modifier_2 IS NOT NULL AND modifier_2 != '' THEN 
                        CASE WHEN modifier_2_details IS NOT NULL AND modifier_2_details != '' 
                          THEN modifier_2 || ' - ' || modifier_2_details 
                          ELSE modifier_2 
                        END
                      ELSE NULL 
                    END
                  FROM master_data_may_30_cleaned 
                  WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                    AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                    AND service_code = $3
                    AND modifier_2 IS NOT NULL 
                    AND modifier_2 != ''
                  UNION
                  SELECT 
                    CASE 
                      WHEN modifier_3 IS NOT NULL AND modifier_3 != '' THEN 
                        CASE WHEN modifier_3_details IS NOT NULL AND modifier_3_details != '' 
                          THEN modifier_3 || ' - ' || modifier_3_details 
                          ELSE modifier_3 
                        END
                      ELSE NULL 
                    END
                  FROM master_data_may_30_cleaned 
                  WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                    AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                    AND service_code = $3
                    AND modifier_3 IS NOT NULL 
                    AND modifier_3 != ''
                  UNION
                  SELECT 
                    CASE 
                      WHEN modifier_4 IS NOT NULL AND modifier_4 != '' THEN 
                        CASE WHEN modifier_4_details IS NOT NULL AND modifier_4_details != '' 
                          THEN modifier_4 || ' - ' || modifier_4_details 
                          ELSE modifier_4 
                        END
                      ELSE NULL 
                    END
                  FROM master_data_may_30_cleaned 
                  WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                    AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                    AND service_code = $3
                    AND modifier_4 IS NOT NULL 
                    AND modifier_4 != ''
                )
                SELECT DISTINCT modifier 
                FROM modifier_data 
                WHERE modifier IS NOT NULL 
                ORDER BY modifier
              `,
              data: `
                SELECT * 
                FROM master_data_may_30_cleaned 
                WHERE TRIM(UPPER(service_category)) = TRIM(UPPER($1))
                  AND TRIM(UPPER(state_name)) = TRIM(UPPER($2))
                  AND service_code = $3
                ORDER BY state_name, service_code
              `
            };

            // Debug logging for queries
            console.log('Executing queries with params:', baseParams);

            try {
              // Execute queries one by one for better error tracking
              const programsResult = await pool.query(filterQueries.programs, baseParams);
              console.log('Programs query successful');
              
              const locationRegionsResult = await pool.query(filterQueries.locationRegions, baseParams);
              console.log('Location regions query successful');
              
              const providerTypesResult = await pool.query(filterQueries.providerTypes, baseParams);
              console.log('Provider types query successful');
              
              const serviceDescriptionsResult = await pool.query(filterQueries.serviceDescriptions, baseParams);
              console.log('Service descriptions query successful');
              
              const modifiersResult = await pool.query(filterQueries.modifiers, baseParams);
              console.log('Modifiers query successful');
              
              const dataResult = await pool.query(filterQueries.data, baseParams);
              console.log('Data query successful');

              otherFilterOptions = {
                programs: programsResult.rows.map(r => r.program).filter(Boolean),
                locationRegions: locationRegionsResult.rows.map(r => r.location_region).filter(Boolean),
                providerTypes: providerTypesResult.rows.map(r => r.provider_type).filter(Boolean),
                serviceDescriptions: serviceDescriptionsResult.rows.map(r => r.service_description).filter(Boolean),
                modifiers: modifiersResult.rows.map(r => ({ value: r.modifier, label: r.modifier })).filter(Boolean),
                feeScheduleDates: [],
                data: dataResult.rows
              };
            } catch (queryError) {
              console.error('Error executing individual query:', queryError);
              throw queryError;
            }
          } catch (error) {
            console.error('Error in filter queries:', error);
            throw error;
          }
        }

        // Also get fee schedule dates when we have service category and state
        if (serviceCategory && state) {
          const feeScheduleDatesQuery = `
            SELECT DISTINCT rate_effective_date
            FROM master_data_may_30_cleaned
            WHERE TRIM(UPPER(state_name)) = TRIM(UPPER($1))
              AND TRIM(UPPER(service_category)) = TRIM(UPPER($2))
              AND rate_effective_date IS NOT NULL
            ORDER BY rate_effective_date DESC
          `;
          const feeScheduleDatesResult = await pool.query(feeScheduleDatesQuery, [state, serviceCategory]);
          otherFilterOptions.feeScheduleDates = feeScheduleDatesResult.rows.map(r => r.rate_effective_date).filter(Boolean);
        }
      }

      return NextResponse.json({
        filterOptions: {
          serviceCategories: categoriesResult.rows.map(r => r.service_category).filter(Boolean).sort(),
          states: statesResult.rows.map(r => r.state_name).filter(Boolean).sort(),
          serviceCodes: serviceCodes,
          ...otherFilterOptions
        }
      });
    }

    // New: State averages for All States chart
    if (mode === 'stateAverages') {
      const serviceCategory = searchParams.get('serviceCategory');
      const serviceCode = searchParams.get('serviceCode');
      if (!serviceCategory || !serviceCode) {
        return NextResponse.json({ error: 'Missing serviceCategory or serviceCode' }, { status: 400 });
      }
      const avgQuery = `
        SELECT
          state_name,
          AVG(
            CASE
              WHEN duration_unit = '15 MINUTES' THEN CAST(REPLACE(rate, '$', '') AS NUMERIC) * 4
              WHEN duration_unit = '30 MINUTES' THEN CAST(REPLACE(rate, '$', '') AS NUMERIC) * 2
              WHEN duration_unit = 'PER HOUR' THEN CAST(REPLACE(rate, '$', '') AS NUMERIC)
              ELSE 0
            END
          ) AS avg_rate
        FROM master_data_may_30_cleaned
        WHERE TRIM(service_code) = $1
          AND TRIM(service_category) = $2
          AND rate IS NOT NULL AND rate <> ''
        GROUP BY state_name
        ORDER BY state_name;
      `;
      const result = await pool.query(avgQuery, [serviceCode, serviceCategory]);
      return NextResponse.json({ stateAverages: result.rows });
    }

    // For data mode, get all filters
    const serviceCategory = searchParams.get("serviceCategory") || searchParams.get("service_category");
    const state = searchParams.get("state") || searchParams.get("state_name");
    const serviceCode = searchParams.get("serviceCode") || searchParams.get("service_code");
    const serviceDescription = searchParams.get("serviceDescription") || searchParams.get("service_description");
    const program = searchParams.get("program");
    const locationRegion = searchParams.get("locationRegion") || searchParams.get("location_region");
    const modifier = searchParams.get("modifier") || searchParams.get("modifier_1");
    const providerType = searchParams.get("providerType") || searchParams.get("provider_type");
    const startDate = searchParams.get("startDate") || searchParams.get("start_date");
    const endDate = searchParams.get("endDate") || searchParams.get("end_date");
    const feeScheduleDate = searchParams.get("feeScheduleDate") || searchParams.get("fee_schedule_date");
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

    // Date filters - prioritize feeScheduleDate over date range
    if (feeScheduleDate) {
      whereClause.push(`rate_effective_date = $${params.length + 1}`);
      params.push(feeScheduleDate);
    } else if (startDate && endDate) {
      whereClause.push(`rate_effective_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(startDate, endDate);
    } else if (startDate) {
      whereClause.push(`rate_effective_date >= $${params.length + 1}`);
      params.push(startDate);
    } else if (endDate) {
      whereClause.push(`rate_effective_date <= $${params.length + 1}`);
      params.push(endDate);
    }

    // Parse sort parameter
    const sortParam = searchParams.get('sort');
    // List of allowed columns for sorting
    const allowedSortColumns = [
      'state_name', 'service_category', 'service_code', 'service_description', 'duration_unit', 'rate', 'rate_effective_date',
      'modifier_1', 'modifier_2', 'modifier_3', 'modifier_4', 'program', 'location_region', 'provider_type'
    ];
    let orderByClause = '';
    if (sortParam) {
      // Example: sort=rate_effective_date:desc,rate:asc
      const sortParts = sortParam.split(',').map(s => s.trim()).filter(Boolean);
      const orderBys: string[] = [];
      for (const part of sortParts) {
        const [col, dir] = part.split(':');
        const colSafe = allowedSortColumns.includes(col) ? col : null;
        const dirSafe = dir && dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        if (colSafe) {
          // Special handling for rate: cast to numeric for sorting
          if (colSafe === 'rate') {
            orderBys.push(`CAST(REPLACE(rate, '$', '') AS NUMERIC) ${dirSafe}`);
          } else if (colSafe === 'rate_effective_date') {
            orderBys.push(`CAST(rate_effective_date AS DATE) ${dirSafe}`);
          } else {
            orderBys.push(`${colSafe} ${dirSafe}`);
          }
        }
      }
      if (orderBys.length > 0) {
        orderByClause = ' ORDER BY ' + orderBys.join(', ');
      }
    }

    // Construct the base queries for data
    let dataQuery = `SELECT id, service_category, service_sub_category, state_id_pk, state_name, state_code, filename, page_number, service_id_pk, service_code, service_description, rate, rate_last_updated, rate_effective_date, duration_unit, minutes, program, modifier_1, modifier_1_details, modifier_2, modifier_2_details, modifier_3, modifier_3_details, modifier_4, modifier_4_details, fee, max_fee, modifier_id_pk, service_id_fk, prior_auth_required, comments, location_region, update_id_pk, times_rate_updated, percentage_change, last_database_refresh, requires_pa, rate_per_hour, provider_type, age, modifier_key FROM master_data_may_30_cleaned`;

    // Add WHERE clause if we have any conditions
    if (whereClause.length > 0) {
      dataQuery += " WHERE " + whereClause.join(" AND ");
    }

    // Add ordering
    if (orderByClause) {
      dataQuery += orderByClause;
    } else {
      dataQuery += " ORDER BY state_name ASC, service_code ASC";
    }

    // Add pagination
    const offset = (page - 1) * itemsPerPage;
    dataQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(itemsPerPage, offset);

    // Debug logging
    console.log('Historical Rates API - Data Query:', dataQuery);
    console.log('Historical Rates API - Params:', params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM master_data_may_30_cleaned ${
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : ""
    }`;
    const countResult = await pool.query(countQuery, params.slice(0, -2)); // Remove pagination params for count

    // Execute data query
    const dataResult = await pool.query(dataQuery, params);
    console.log('Historical Rates API - Rows returned:', dataResult.rows.length);

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
