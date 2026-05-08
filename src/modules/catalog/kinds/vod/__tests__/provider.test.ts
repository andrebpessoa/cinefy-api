import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("getVodStreams URL resolution", () => {
	beforeEach(() => {
		process.env.NODE_ENV = "test";
		delete process.env.VOD_PROVIDER_URL;
	});

	afterEach(() => {
		process.env.NODE_ENV = "test";
		delete process.env.VOD_PROVIDER_URL;
	});

	it("throws when production and VOD_PROVIDER_URL missing", async () => {
		delete process.env.VOD_PROVIDER_URL;
		process.env.NODE_ENV = "production";
		process.env.SYNC_API_KEY = "x".repeat(24);
		const { getVodStreams } = await import("../provider");
		await expect(getVodStreams()).rejects.toThrow(/VOD_PROVIDER_URL/i);
	});
});
