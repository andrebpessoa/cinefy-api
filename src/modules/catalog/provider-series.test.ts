import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("getSeriesStreams URL resolution", () => {
	beforeEach(() => {
		delete process.env.SERIES_PROVIDER_URL;
		delete process.env.NODE_ENV;
	});

	afterEach(() => {
		delete process.env.SERIES_PROVIDER_URL;
		delete process.env.NODE_ENV;
	});

	it("throws when production and SERIES_PROVIDER_URL missing", async () => {
		process.env.NODE_ENV = "production";
		const { getSeriesStreams } = await import("./provider-series");
		await expect(getSeriesStreams()).rejects.toThrow(/SERIES_PROVIDER_URL/i);
	});
});
