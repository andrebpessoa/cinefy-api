import "dotenv/config";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { env } from "./config/env";

const migrationsFolder =
	process.env.MIGRATIONS_FOLDER ?? join(process.cwd(), "src/db/migrations");

const pool = new pg.Pool({
	connectionString: env.DATABASE_URL,
	max: 5,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 5_000,
	ssl: env.PG_SSL ? { rejectUnauthorized: true } : undefined,
});

try {
	const db = drizzle({ client: pool });
	await migrate(db, { migrationsFolder });
} finally {
	await pool.end();
}
