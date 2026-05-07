import "dotenv/config";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error("DATABASE_URL is not set");
	process.exit(1);
}

const migrationsFolder =
	process.env.MIGRATIONS_FOLDER ?? join(process.cwd(), "src/db/migrations");

const pool = new pg.Pool({ connectionString: databaseUrl });

try {
	const db = drizzle({ client: pool });
	await migrate(db, { migrationsFolder });
} finally {
	await pool.end();
}
