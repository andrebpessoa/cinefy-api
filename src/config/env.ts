import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const skipEnvValidation = process.env.SKIP_ENV_VALIDATION === "true";

/** Flags vindas do ambiente como string; evita `Boolean("false") === true` de `z.coerce.boolean()`. */
const envBoolean = (defaultValue: boolean) =>
	z.preprocess((val: unknown) => {
		if (val === undefined || val === "") return defaultValue;
		if (typeof val === "boolean") return val;
		if (typeof val === "string") {
			const v = val.trim().toLowerCase();
			if (["1", "true", "yes", "on"].includes(v)) return true;
			if (["0", "false", "no", "off"].includes(v)) return false;
		}
		return defaultValue;
	}, z.boolean());

export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		PORT: z.coerce.number().int().positive().default(3000),
		HOST: z.string().default("0.0.0.0"),
		DATABASE_URL: z
			.string()
			.url()
			.default("postgres://postgres:postgres@localhost:5432/cinefy"),
		BETTER_AUTH_SECRET: z
			.string()
			.min(1)
			.default("dev-secret-at-least-32-characters-long!!"),
		BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
		SYNC_API_KEY: z.string().optional(),
		VOD_PROVIDER_URL: z.string().url().optional(),
		SERIES_PROVIDER_URL: z.string().url().optional(),
		LIVE_PROVIDER_URL: z.string().url().optional(),
		CATALOG_PROVIDER_TIMEOUT_MS: z.coerce
			.number()
			.int()
			.positive()
			.default(30000),
		CATALOG_SYNC_CRON: z.string().default("*/30 * * * *"),
		CATALOG_SYNC_MIN_RETENTION_FRACTION: z.coerce
			.number()
			.min(0)
			.max(1)
			.default(0.5),
		ALLOWED_ORIGINS: z.string().default("http://localhost:3001"),
		SKIP_DB_MIGRATIONS: envBoolean(false),
		PG_SSL: envBoolean(false),
		REDIS_URL: z.url().default("redis://localhost:6379"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	skipValidation: skipEnvValidation,
	createFinalSchema: (shape) =>
		z.object(shape).superRefine((data, ctx) => {
			if (data.NODE_ENV !== "production") return;
			if (data.BETTER_AUTH_SECRET.length < 32) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"BETTER_AUTH_SECRET must be at least 32 characters in production",
					path: ["BETTER_AUTH_SECRET"],
				});
			}
			const syncKey = data.SYNC_API_KEY;
			if (!syncKey || syncKey.length < 24) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "SYNC_API_KEY must be at least 24 characters in production",
					path: ["SYNC_API_KEY"],
				});
			}
		}),
});

export type Env = typeof env;
