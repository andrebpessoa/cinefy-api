import { describe, expect, it } from "bun:test";
import { externalSeriesItemSchema } from "./model-series";

describe("externalSeriesItemSchema", () => {
	it("aceita payload mínimo válido", () => {
		const parsed = externalSeriesItemSchema.safeParse({
			num: 1,
			name: "S",
			title: "T",
			year: "2020",
			stream_type: "series",
			series_id: 10,
			cover: "",
			plot: "",
			cast: "",
			director: "",
			genre: "",
			release_date: "2020-01-01",
			releaseDate: "2020-01-01",
			last_modified: "x",
			rating: "PG",
			rating_5based: 4.5,
			backdrop_path: [],
			youtube_trailer: "",
			episode_run_time: "45",
			category_id: "1",
			category_ids: [1],
		});
		expect(parsed.success).toBe(true);
	});

	it("aceita campos opcionais ausentes ou null como na API", () => {
		const parsed = externalSeriesItemSchema.safeParse({
			num: 1,
			name: "S",
			title: "T",
			stream_type: "series",
			series_id: 10,
			cover: "x",
			last_modified: "x",
			rating: "PG",
			rating_5based: 4,
			episode_run_time: "45",
			category_id: "1",
			category_ids: [1],
			year: null,
			plot: undefined,
			backdrop_path: [null, "https://a/b.jpg"],
		});
		expect(parsed.success).toBe(true);
	});
});
