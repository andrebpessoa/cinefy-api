import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("getLiveStreams URL resolution", () => {
	beforeEach(() => {
		process.env.NODE_ENV = "test";
		delete process.env.LIVE_PROVIDER_URL;
	});

	afterEach(() => {
		process.env.NODE_ENV = "test";
		delete process.env.LIVE_PROVIDER_URL;
	});

	it("throws when production and LIVE_PROVIDER_URL missing", async () => {
		process.env.NODE_ENV = "production";
		process.env.SYNC_API_KEY = "x".repeat(24);
		delete process.env.LIVE_PROVIDER_URL;
		const { getLiveStreams } = await import("../provider");
		await expect(getLiveStreams()).rejects.toThrow(/LIVE_PROVIDER_URL/i);
	});
});
