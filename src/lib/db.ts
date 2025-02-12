import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "project-daisy.postgres.database.azure.com",
  database: process.env.DB_NAME || "provider_alerts_db",
  user: process.env.DB_USER || "project_daisy",
  password: process.env.DB_PASS || "Postgres@123",
  port: 5432,
  ssl: { rejectUnauthorized: false }, // Required for Azure-hosted databases
});

export default pool;
