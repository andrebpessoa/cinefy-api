import { describe, expect, it } from "bun:test";
import { createStubRedisClient } from "../../../lib/__tests__/stub-redis-client";
import { TooManyRequestsAppError } from "../../../lib/errors";
import { createRateLimitStore } from "../../../lib/rate-limit-store";
import {
	CATALOG_RATE_LIMIT_GET_MAX,
	CATALOG_RATE_LIMIT_SYNC_MAX,
	catalogRateLimitBeforeHandle,
} from "../catalog-rate-limit";

describe("catalogRateLimitBeforeHandle", () => {
	const makeStore = () => createRateLimitStore(createStubRedisClient());

	it("bloqueia GET de lista após o limite por IP", async () => {
		const s = makeStore();
		const req = new Request("http://test/v1/catalog/vod");
		for (let i = 0; i < CATALOG_RATE_LIMIT_GET_MAX; i += 1) {
			await catalogRateLimitBeforeHandle(s, req);
		}
		await expect(catalogRateLimitBeforeHandle(s, req)).rejects.toThrow(
			TooManyRequestsAppError,
		);
	});

	it("bloqueia POST sync após o limite por hash do bearer", async () => {
		const s = makeStore();
		const req = new Request("http://test/v1/catalog/vod/sync", {
			method: "POST",
			headers: { Authorization: "Bearer sync-test-token" },
		});
		for (let i = 0; i < CATALOG_RATE_LIMIT_SYNC_MAX; i += 1) {
			await catalogRateLimitBeforeHandle(s, req);
		}
		await expect(catalogRateLimitBeforeHandle(s, req)).rejects.toThrow(
			TooManyRequestsAppError,
		);
	});

	it("ignora rotas fora de /v1/catalog", async () => {
		const s = makeStore();
		await catalogRateLimitBeforeHandle(s, new Request("http://test/health"));
	});
});
