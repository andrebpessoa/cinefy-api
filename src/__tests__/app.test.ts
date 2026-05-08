import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { createApp } from "../app";
import { env } from "../config/env";
import type { Container } from "../container";
import { createStubRedisClient } from "../lib/__tests__/stub-redis-client";
import { createRateLimitStore } from "../lib/rate-limit-store";
import type { CatalogServiceContract } from "../modules/catalog/service";
import type { SyncJobsRepo } from "../modules/catalog/sync-jobs.repo";

function testContainer(): Container {
	const catalogService = {
		getVodCatalog: async () => ({
			items: [],
			total: 0,
			maxSyncedAt: null,
		}),
		getSeriesCatalog: async () => ({
			items: [],
			total: 0,
			maxSyncedAt: null,
		}),
		getLiveCatalog: async () => ({
			items: [],
			total: 0,
			maxSyncedAt: null,
		}),
		getSyncState: async () => null,
		syncVodStreams: async () => {},
		syncSeriesStreams: async () => {},
		syncLiveStreams: async () => {},
	} satisfies CatalogServiceContract;

	const syncJobs: SyncJobsRepo = {
		create: async () => crypto.randomUUID(),
		markRunning: async () => {},
		markSucceeded: async () => {},
		markFailed: async () => {},
		getById: async () => undefined,
	};

	const authStub = { handler: new Elysia() } as unknown as Container["auth"];

	const redis = createStubRedisClient();
	return {
		env,
		db: {} as Container["db"],
		pool: {} as Container["pool"],
		redis,
		rateLimitStore: createRateLimitStore(redis),
		auth: authStub,
		catalogService,
		syncJobs,
		openapiPlugin: new Elysia(),
	};
}

describe("createApp", () => {
	it("GET /health retorna 200", async () => {
		const app = createApp(testContainer());
		const res = await app.handle(new Request("http://test/health"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { status: string };
		expect(body.status).toBe("ok");
	});

	it("GET /v1/catalog/vod retorna lista vazia", async () => {
		const app = createApp(testContainer());
		const res = await app.handle(new Request("http://test/v1/catalog/vod"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			items: unknown[];
			pagination: { totalItems: number };
		};
		expect(body.items).toEqual([]);
		expect(body.pagination.totalItems).toBe(0);
	});
});
