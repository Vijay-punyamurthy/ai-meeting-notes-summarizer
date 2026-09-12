import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pgPool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: Number(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "postgres",
  database: process.env.PG_DATABASE || "meeting_notes",
});

pgPool.on("error", (err) => {
  // Idle client errors shouldn't crash the whole process.
  console.error("Unexpected PG pool error:", err);
});
