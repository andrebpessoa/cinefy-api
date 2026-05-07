import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { CatalogServiceContract } from "./service";

const originalCron = Bun.cron;
const originalCronEnv = process.env.CATALOG_SYNC_CRON;

describe("startCatalogScheduler", () => {
	beforeEach(() => {
		delete process.env.CATALOG_SYNC_CRON;
	});

	afterEach(() => {
		Reflect.set(Bun, "cron", originalCron);
		if (originalCronEnv === undefined) {
			delete process.env.CATALOG_SYNC_CRON;
		} else {
			process.env.CATALOG_SYNC_CRON = originalCronEnv;
		}
	});

	it("regista Bun.cron com expressao customizada", async () => {
		const cronMock = mock((_schedule: string, _handler: () => void) => ({
			stop: () => {},
		}));
		Reflect.set(Bun, "cron", cronMock);
		process.env.CATALOG_SYNC_CRON = "15 * * * *";

		const syncVodStreams = mock(async () => {});
		const syncSeriesStreams = mock(async () => {});
		const syncLiveStreams = mock(async () => {});
		const service = {
			getVodCatalog: mock(async () => ({ items: [], total: 0 })),
			getSeriesCatalog: mock(async () => ({ items: [], total: 0 })),
			getLiveCatalog: mock(async () => ({ items: [], total: 0 })),
			getSyncState: mock(async () => null),
			syncVodStreams,
			syncSeriesStreams,
			syncLiveStreams,
		} satisfies CatalogServiceContract;

		mock.module("./service", () => ({
			catalogService: service,
		}));
		const { startCatalogScheduler } = await import("./scheduler");

		startCatalogScheduler(service);
		expect(cronMock).toHaveBeenCalledTimes(1);
		expect(cronMock.mock.calls[0]?.[0]).toBe("15 * * * *");
	});

	it("usa */30 * * * * quando CATALOG_SYNC_CRON nao esta definido", async () => {
		const cronMock = mock((_schedule: string, _handler: () => void) => ({
			stop: () => {},
		}));
		Reflect.set(Bun, "cron", cronMock);

		const syncVodStreams = mock(async () => {});
		const syncSeriesStreams = mock(async () => {});
		const syncLiveStreams = mock(async () => {});
		const service = {
			getVodCatalog: mock(async () => ({ items: [], total: 0 })),
			getSeriesCatalog: mock(async () => ({ items: [], total: 0 })),
			getLiveCatalog: mock(async () => ({ items: [], total: 0 })),
			getSyncState: mock(async () => null),
			syncVodStreams,
			syncSeriesStreams,
			syncLiveStreams,
		} satisfies CatalogServiceContract;

		mock.module("./service", () => ({
			catalogService: service,
		}));
		const { startCatalogScheduler } = await import("./scheduler");

		startCatalogScheduler(service);
		expect(cronMock.mock.calls[0]?.[0]).toBe("*/30 * * * *");
	});

	it("executa sync no callback do cron", async () => {
		let registeredHandler: (() => void) | undefined;
		const cronMock = mock((_schedule: string, handler: () => void) => {
			registeredHandler = handler;
			return { stop: () => {} };
		});
		Reflect.set(Bun, "cron", cronMock);

		const syncVodStreams = mock(async () => {});
		const syncSeriesStreams = mock(async () => {});
		const syncLiveStreams = mock(async () => {});
		const service = {
			getVodCatalog: mock(async () => ({ items: [], total: 0 })),
			getSeriesCatalog: mock(async () => ({ items: [], total: 0 })),
			getLiveCatalog: mock(async () => ({ items: [], total: 0 })),
			getSyncState: mock(async () => null),
			syncVodStreams,
			syncSeriesStreams,
			syncLiveStreams,
		} satisfies CatalogServiceContract;

		mock.module("./service", () => ({
			catalogService: service,
		}));
		const { startCatalogScheduler } = await import("./scheduler");

		startCatalogScheduler(service);
		expect(typeof registeredHandler).toBe("function");
		registeredHandler?.();
		await Bun.sleep(0);

		expect(syncVodStreams).toHaveBeenCalled();
	});
});
