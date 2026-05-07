import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

export const logger = pino(
	isTest
		? {
				level: "silent",
			}
		: isProduction
			? {}
			: {
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
