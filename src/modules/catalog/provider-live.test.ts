import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("getLiveStreams URL resolution", () => {
	beforeEach(() => {
		delete process.env.LIVE_PROVIDER_URL;
		delete process.env.NODE_ENV;
	});

	afterEach(() => {
		delete process.env.LIVE_PROVIDER_URL;
		delete process.env.NODE_ENV;
	});

	it("throws when production and LIVE_PROVIDER_URL missing", async () => {
		process.env.NODE_ENV = "production";
		const { getLiveStreams } = await import("./provider-live");
		await expect(getLiveStreams()).rejects.toThrow(/LIVE_PROVIDER_URL/i);
	});
});
