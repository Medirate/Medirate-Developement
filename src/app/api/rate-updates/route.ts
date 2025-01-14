import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    // Corrected table name to 'provider_alerts'
    const { rows } = await pool.query("SELECT * FROM provider_alerts ORDER BY date_extracted DESC");

    // Return the rows as JSON
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching data:", error.message, error.stack);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
