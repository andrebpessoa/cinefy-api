import { RedisClient } from "bun";
import type { Env } from "../config/env";

export function createRedis(env: Env): RedisClient {
	return new RedisClient(env.REDIS_URL, {
		connectionTimeout: 5000,
		autoReconnect: true,
		enableOfflineQueue: true,
	});
}

export async function closeRedis(client: RedisClient): Promise<void> {
	try {
		const maybeQuit = client as RedisClient & {
			quit?: () => Promise<void>;
			close?: () => Promise<void>;
		};
		if (typeof maybeQuit.quit === "function") {
			await maybeQuit.quit();
			return;
		}
		if (typeof maybeQuit.close === "function") {
			await maybeQuit.close();
		}
	} catch {
		// ignore shutdown errors
	}
}
