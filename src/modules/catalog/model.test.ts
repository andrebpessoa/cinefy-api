import { describe, expect, it } from "bun:test";
import { externalVodListSchema, internalCatalogItemSchema } from "./model";

describe("catalog model schemas", () => {
	it("aceita lista externa valida", () => {
		const parsed = externalVodListSchema.safeParse([
			{
				num: 1,
				name: "Movie Name",
				title: "Movie Title",
				year: null,
				stream_type: "movie",
				stream_id: 10,
				stream_icon: "https://img.example/icon.jpg",
				rating: 4.2,
				rating_5based: 4.5,
				added: "1710000000",
				category_id: "3",
				category_ids: [3],
				container_extension: "mkv",
				custom_sid: "sid-01",
				direct_source: "https://cdn.example/video.mp4",
			},
		]);

		expect(parsed.success).toBe(true);
	});

	it("aceita year e container_extension null", () => {
		const parsed = externalVodListSchema.safeParse([
			{
				num: 2,
				name: "N",
				title: "T",
				year: null,
				stream_type: "movie",
				stream_id: 11,
				stream_icon: "",
				rating: 0,
				rating_5based: 0,
				added: "0",
				category_id: "1",
				category_ids: [],
				container_extension: null,
				custom_sid: "",
				direct_source: "",
			},
		]);
		expect(parsed.success).toBe(true);
	});

	it("rejeita lista externa invalida", () => {
		const parsed = externalVodListSchema.safeParse([
			{
				name: "missing required fields",
			},
		]);

		expect(parsed.success).toBe(false);
	});

	it("aceita item interno valido", () => {
		const parsed = internalCatalogItemSchema.safeParse({
			externalId: 10,
			name: "Movie Name",
			title: "Movie Title",
			year: "2020",
			streamType: "movie",
			streamIcon: "https://img.example/icon.jpg",
			rating: 4.2,
			rating5based: 4.5,
			added: "1710000000",
			categoryId: "3",
			categoryIds: [3],
			containerExtension: null,
			customSid: "sid-01",
			directSource: "https://cdn.example/video.mp4",
			rawPayload: { any: "value" },
			sourceUpdatedAt: null,
			syncedAt: new Date("2026-01-01T00:00:00.000Z"),
		});

		expect(parsed.success).toBe(true);
	});
});
