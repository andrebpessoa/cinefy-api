import { describe, expect, it } from "bun:test";
import { createRateLimitStore } from "../rate-limit-store";
import { createStubRedisClient } from "./stub-redis-client";

describe("createRateLimitStore", () => {
	it("incrementa contagens na mesma janela", async () => {
		const store = createRateLimitStore(createStubRedisClient());
		expect(await store.incrWithTtl("k", 60_000)).toBe(1);
		expect(await store.incrWithTtl("k", 60_000)).toBe(2);
	});

	it("reinicia contagem após expiração da janela", async () => {
		const store = createRateLimitStore(createStubRedisClient());
		expect(await store.incrWithTtl("x", 20)).toBe(1);
		await Bun.sleep(25);
		expect(await store.incrWithTtl("x", 20)).toBe(1);
	});
});
