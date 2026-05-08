import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("getSeriesStreams URL resolution", () => {
	beforeEach(() => {
		process.env.NODE_ENV = "test";
		delete process.env.SERIES_PROVIDER_URL;
	});

	afterEach(() => {
		process.env.NODE_ENV = "test";
		delete process.env.SERIES_PROVIDER_URL;
	});

	it("throws when production and SERIES_PROVIDER_URL missing", async () => {
		process.env.NODE_ENV = "production";
		process.env.SYNC_API_KEY = "x".repeat(24);
		delete process.env.SERIES_PROVIDER_URL;
		const { getSeriesStreams } = await import("../provider");
		await expect(getSeriesStreams()).rejects.toThrow(/SERIES_PROVIDER_URL/i);
	});
});
