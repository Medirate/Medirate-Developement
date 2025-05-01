import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = "SELECT * FROM service_data_master_apr_29";
    const params = [];

    if (startDate && endDate) {
      query += " WHERE rate_effective_date BETWEEN $1 AND $2";
      params.push(startDate, endDate);
    }

    query += " ORDER BY state_name ASC";

    const { rows } = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching state payment comparison data:", error.message, error.stack);
    } else {
      console.error("Unknown error occurred:", error);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
