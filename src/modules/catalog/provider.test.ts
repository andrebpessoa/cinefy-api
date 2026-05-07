import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("getVodStreams URL resolution", () => {
	beforeEach(() => {
		delete process.env.VOD_PROVIDER_URL;
		delete process.env.NODE_ENV;
	});

	afterEach(() => {
		delete process.env.VOD_PROVIDER_URL;
		delete process.env.NODE_ENV;
	});

	it("throws when production and VOD_PROVIDER_URL missing", async () => {
		delete process.env.VOD_PROVIDER_URL;
		process.env.NODE_ENV = "production";
		const { getVodStreams } = await import("./provider");
		await expect(getVodStreams()).rejects.toThrow(/VOD_PROVIDER_URL/i);
	});
});
