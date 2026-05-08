import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import type { RedisClient } from "bun";
import type { Env } from "../config/env";
import type { DbClient } from "../db/client";
import * as schema from "../db/schema";

export function createAuth(deps: {
	db: DbClient;
	env: Env;
	redis: RedisClient;
}) {
	const { db, env, redis } = deps;

	const secondaryStorage = {
		get: async (key: string) => {
			try {
				const v = await redis.get(key);
				if (v == null) return null;
				return typeof v === "string" ? v : String(v);
			} catch {
				return null;
			}
		},
		set: async (key: string, value: string, ttl?: number) => {
			if (ttl !== undefined) {
				await redis.send("SET", [key, value, "EX", String(ttl)]);
			} else {
				await redis.set(key, value);
			}
		},
		delete: async (key: string) => {
			await redis.del(key);
		},
	};

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema,
		}),
		basePath: "/api",
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		emailAndPassword: {
			enabled: true,
		},
		secondaryStorage,
		rateLimit: {
			enabled: true,
			storage: "secondary-storage",
			window: 60,
			max: 100,
			customRules: {
				"/sign-in/email": { window: 60, max: 5 },
			},
		},
		plugins: [openAPI()],
	});
}

export type AuthInstance = ReturnType<typeof createAuth>;
