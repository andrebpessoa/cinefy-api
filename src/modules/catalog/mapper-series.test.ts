import { describe, expect, it } from "bun:test";
import { mapSeriesItem } from "./mapper";

describe("mapSeriesItem", () => {
	it("mapeia series_id e release_date", () => {
		const syncedAt = new Date("2026-01-01T00:00:00.000Z");
		const row = mapSeriesItem(
			{
				num: 1,
				name: "S",
				title: "T",
				year: "2020",
				stream_type: "series",
				series_id: 42,
				cover: "",
				plot: "",
				cast: "",
				director: "",
				genre: "",
				release_date: "2020-06-01",
				releaseDate: "2020-06-01",
				last_modified: "x",
				rating: "PG",
				rating_5based: 4,
				backdrop_path: [],
				youtube_trailer: "",
				episode_run_time: "45",
				category_id: "1",
				category_ids: [1],
			},
			syncedAt,
		);
		expect(row.externalId).toBe(42);
		expect(row.releaseDate).toBe("2020-06-01");
		expect(row.syncedAt).toBe(syncedAt);
	});

	it("usa releaseDate quando release_date vem vazio", () => {
		const syncedAt = new Date("2026-01-01T00:00:00.000Z");
		const row = mapSeriesItem(
			{
				num: 1,
				name: "S",
				title: "T",
				year: null,
				stream_type: "series",
				series_id: 42,
				cover: "",
				plot: null,
				cast: null,
				director: null,
				genre: null,
				release_date: null,
				releaseDate: "2020-07-01",
				last_modified: "x",
				rating: "PG",
				rating_5based: 4,
				backdrop_path: null,
				youtube_trailer: null,
				episode_run_time: "45",
				category_id: "1",
				category_ids: [1],
			},
			syncedAt,
		);
		expect(row.releaseDate).toBe("2020-07-01");
		expect(row.year).toBeNull();
		expect(row.plot).toBeNull();
		expect(row.youtubeTrailer).toBeNull();
		expect(row.backdropPath).toEqual([]);
	});
});
