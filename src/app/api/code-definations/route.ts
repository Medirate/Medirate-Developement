import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    // First, let's verify the table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'code_definitions'
      );
    `;

    const { rows: [tableExists] } = await pool.query(checkTableQuery);
    
    if (!tableExists.exists) {
      return NextResponse.json(
        { error: "Table 'code_definitions' does not exist" },
        { status: 404 }
      );
    }

    // If table exists, fetch the data
    const query = `
      SELECT 
        state_name_cpt_codes, 
        service_code, 
        service_description 
      FROM code_definitions
      ORDER BY state_name_cpt_codes, service_code
    `;

    const { rows } = await pool.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching code definitions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
