import type { RedisClient } from "bun";

export function createStubRedisClient(): RedisClient {
	const rateState = new Map<string, { n: number; expiresAt: number }>();
	const kv = new Map<string, string>();

	return {
		async get(key: string) {
			return kv.get(key) ?? null;
		},
		async set(key: string, value: string) {
			kv.set(key, value);
		},
		async del(key: string) {
			kv.delete(key);
		},
		async send(cmd: string, args: string[]) {
			if (cmd === "EVAL") {
				const key = args[2];
				const windowMs = Number(args[3]);
				if (key === undefined || !Number.isFinite(windowMs)) {
					throw new Error("stub EVAL");
				}
				const now = Date.now();
				const meta = rateState.get(key);
				if (!meta || now >= meta.expiresAt) {
					rateState.set(key, { n: 1, expiresAt: now + windowMs });
					return "1";
				}
				meta.n += 1;
				return String(meta.n);
			}
			if (cmd === "SET" && args.length >= 2) {
				const k = args[0];
				const v = args[1];
				if (k === undefined || v === undefined) {
					throw new Error("stub SET");
				}
				kv.set(k, v);
				return "OK";
			}
			throw new Error(`stub: comando não suportado: ${cmd}`);
		},
	} as unknown as RedisClient;
}
