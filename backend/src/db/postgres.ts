import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pgPool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PG_SSL === "false"
        ? false
        : { rejectUnauthorized: false }, // Render's internal Postgres requires SSL
  })
  : new Pool({
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "postgres",
    database: process.env.PG_DATABASE || "meeting_notes",
  });
