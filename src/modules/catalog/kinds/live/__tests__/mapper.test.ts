import { describe, expect, it } from "bun:test";
import { mapLiveItem } from "../mapper";

describe("mapLiveItem", () => {
	it("mapeia stream_id e epg_channel_id", () => {
		const syncedAt = new Date("2026-01-01T00:00:00.000Z");
		const row = mapLiveItem(
			{
				num: 1,
				name: "L",
				stream_type: "live",
				stream_id: 7,
				stream_icon: "",
				epg_channel_id: "100",
				added: "",
				custom_sid: "",
				tv_archive: 0,
				direct_source: "",
				tv_archive_duration: 0,
				category_id: "1",
				category_ids: [],
				thumbnail: "",
			},
			syncedAt,
		);
		expect(row.externalId).toBe(7);
		expect(row.epgChannelId).toBe("100");
	});

	it("epg null permanece null", () => {
		const row = mapLiveItem(
			{
				num: 1,
				name: "L",
				stream_type: "live",
				stream_id: 1,
				stream_icon: "",
				epg_channel_id: null,
				added: "",
				custom_sid: "",
				tv_archive: 0,
				direct_source: "",
				tv_archive_duration: 0,
				category_id: "1",
				category_ids: [],
				thumbnail: "",
			},
			new Date(),
		);
		expect(row.epgChannelId).toBeNull();
	});
});
