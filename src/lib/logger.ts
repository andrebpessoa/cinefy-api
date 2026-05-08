import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const redact = {
	paths: [
		"req.headers.authorization",
		"req.headers.cookie",
		"headers.authorization",
		"headers.cookie",
		"*.password",
		"*.token",
		"*.secret",
		"BETTER_AUTH_SECRET",
		"SYNC_API_KEY",
		"DATABASE_URL",
		"REDIS_URL",
	],
	censor: "[REDACTED]",
};

export const logger = pino(
	isTest
		? {
				level: "silent",
				redact,
			}
		: isProduction
			? { redact }
			: {
					redact,
					transport: {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "SYS:standard",
							ignore: "pid,hostname",
						},
					},
				},
);
