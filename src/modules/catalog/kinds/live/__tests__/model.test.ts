import { describe, expect, it } from "bun:test";
import { externalLiveStreamItemSchema } from "../model";

describe("externalLiveStreamItemSchema", () => {
	it("aceita payload mínimo válido", () => {
		const parsed = externalLiveStreamItemSchema.safeParse({
			num: 1,
			name: "Ch",
			stream_type: "live",
			stream_id: 99,
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
		});
		expect(parsed.success).toBe(true);
	});

	it("aceita epg_channel_id string", () => {
		const parsed = externalLiveStreamItemSchema.safeParse({
			num: 1,
			name: "Ch",
			stream_type: "live",
			stream_id: 99,
			stream_icon: "",
			epg_channel_id: "42",
			added: "",
			custom_sid: "",
			tv_archive: 0,
			direct_source: "",
			tv_archive_duration: 0,
			category_id: "1",
			category_ids: [],
			thumbnail: "",
		});
		expect(parsed.success).toBe(true);
	});
});
