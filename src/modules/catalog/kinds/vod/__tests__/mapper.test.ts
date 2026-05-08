import { describe, expect, it } from "bun:test";
import { mapVodItem } from "../mapper";
import type { ExternalVodItem } from "../model";

describe("mapVodItem", () => {
	it("mapeia payload externo para modelo interno", () => {
		const externalItem: ExternalVodItem = {
			num: 1,
			name: "Movie Name",
			title: "Movie Title",
			year: "2024",
			stream_type: "movie",
			stream_id: 123,
			stream_icon: "https://img.example/icon.jpg",
			rating: 4.2,
			rating_5based: 4.5,
			added: "1710000000",
			category_id: "9",
			category_ids: [9, 10],
			container_extension: "mp4",
			custom_sid: "sid-01",
			direct_source: "https://cdn.example/video.mp4",
		};
		const syncedAt = new Date("2026-01-01T00:00:00.000Z");

		const result = mapVodItem(externalItem, syncedAt);

		expect(result).toEqual({
			externalId: 123,
			name: "Movie Name",
			title: "Movie Title",
			year: "2024",
			streamType: "movie",
			streamIcon: "https://img.example/icon.jpg",
			rating: 4.2,
			rating5based: 4.5,
			added: "1710000000",
			categoryId: "9",
			categoryIds: [9, 10],
			containerExtension: "mp4",
			customSid: "sid-01",
			directSource: "https://cdn.example/video.mp4",
			rawPayload: externalItem,
			sourceUpdatedAt: null,
			syncedAt,
		});
	});
});
