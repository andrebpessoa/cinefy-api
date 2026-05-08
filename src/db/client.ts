import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { Env } from "../config/env";
import { relations } from "./relations";

export function createDatabase(env: Env) {
	const pool = new pg.Pool({
		connectionString: env.DATABASE_URL,
		max: 10,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 5_000,
		ssl: env.PG_SSL ? { rejectUnauthorized: true } : undefined,
	});

	const db = drizzle({ client: pool, relations });

	return { db, pool };
}

export type DbClient = ReturnType<typeof createDatabase>["db"];
