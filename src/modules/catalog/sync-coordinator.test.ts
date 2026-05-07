import { describe, expect, it } from "bun:test";
import { runCatalogSyncIfIdle } from "./sync-coordinator";

describe("runCatalogSyncIfIdle", () => {
	it("mesmo kind: segunda execução em paralelo retorna skipped", async () => {
		let innerStarted = 0;
		const slow = () =>
			new Promise<void>((resolve) => {
				innerStarted += 1;
				setTimeout(resolve, 80);
			});

		const first = runCatalogSyncIfIdle(slow, "test-a", "vod");
		const second = runCatalogSyncIfIdle(
			() => Promise.resolve(),
			"test-b",
			"vod",
		);

		const [a, b] = await Promise.all([first, second]);
		expect(a).toBe("ran");
		expect(b).toBe("skipped");
		expect(innerStarted).toBe(1);
	});

	it("kinds diferentes: ambos correm em paralelo", async () => {
		let vodRan = false;
		let seriesRan = false;
		const slowVod = () =>
			new Promise<void>((resolve) => {
				vodRan = true;
				setTimeout(resolve, 60);
			});
		const fastSeries = () =>
			new Promise<void>((resolve) => {
				seriesRan = true;
				setImmediate(resolve);
			});

		const a = runCatalogSyncIfIdle(slowVod, "parallel-vod", "vod");
		const b = runCatalogSyncIfIdle(fastSeries, "parallel-series", "series");
		const [ra, rb] = await Promise.all([a, b]);
		expect(ra).toBe("ran");
		expect(rb).toBe("ran");
		expect(vodRan).toBe(true);
		expect(seriesRan).toBe(true);
	});
});
