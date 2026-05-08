import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { CatalogServiceContract } from "../service";

const originalCron = Bun.cron;
const originalCronEnv = process.env.CATALOG_SYNC_CRON;

const emptyCatalog = { items: [], total: 0, maxSyncedAt: null as Date | null };

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
			getVodCatalog: mock(async () => emptyCatalog),
			getSeriesCatalog: mock(async () => emptyCatalog),
			getLiveCatalog: mock(async () => emptyCatalog),
			getSyncState: mock(async () => null),
			syncVodStreams,
			syncSeriesStreams,
			syncLiveStreams,
		} satisfies CatalogServiceContract;

		const { startCatalogScheduler } = await import("../scheduler");

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
			getVodCatalog: mock(async () => emptyCatalog),
			getSeriesCatalog: mock(async () => emptyCatalog),
			getLiveCatalog: mock(async () => emptyCatalog),
			getSyncState: mock(async () => null),
			syncVodStreams,
			syncSeriesStreams,
			syncLiveStreams,
		} satisfies CatalogServiceContract;

		const { startCatalogScheduler } = await import("../scheduler");

		startCatalogScheduler(service);
		expect(cronMock.mock.calls[0]?.[0]).toBe("*/30 * * * *");
	});

	it("executa sync no callback do cron (paralelo por kind)", async () => {
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
			getVodCatalog: mock(async () => emptyCatalog),
			getSeriesCatalog: mock(async () => emptyCatalog),
			getLiveCatalog: mock(async () => emptyCatalog),
			getSyncState: mock(async () => null),
			syncVodStreams,
			syncSeriesStreams,
			syncLiveStreams,
		} satisfies CatalogServiceContract;

		const { startCatalogScheduler } = await import("../scheduler");

		startCatalogScheduler(service);
		expect(typeof registeredHandler).toBe("function");
		registeredHandler?.();
		await Bun.sleep(50);

		expect(syncVodStreams).toHaveBeenCalled();
		expect(syncSeriesStreams).toHaveBeenCalled();
		expect(syncLiveStreams).toHaveBeenCalled();
	});
});
