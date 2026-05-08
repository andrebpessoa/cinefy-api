import type { RedisClient } from "bun";

export type RateLimitStore = {
	incrWithTtl(key: string, windowMs: number): Promise<number>;
};

const LUA_INCR_PEXPIRE = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return n
`;

export function createRateLimitStore(redis: RedisClient): RateLimitStore {
	return {
		async incrWithTtl(key: string, windowMs: number): Promise<number> {
			const raw = await redis.send("EVAL", [
				LUA_INCR_PEXPIRE.trim(),
				"1",
				key,
				String(windowMs),
			]);
			const n = Number(raw);
			if (!Number.isFinite(n)) {
				throw new Error("Invalid rate limit counter from Redis");
			}
			return n;
		},
	};
}
