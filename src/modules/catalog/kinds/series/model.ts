import { z } from "zod";

export const externalSeriesItemSchema = z.object({
	num: z.number(),
	name: z.string(),
	title: z.string(),
	year: z.string().nullish(),
	stream_type: z.string(),
	series_id: z.number(),
	cover: z.string(),
	plot: z.string().nullish(),
	cast: z.string().nullish(),
	director: z.string().nullish(),
	genre: z.string().nullish(),
	release_date: z.string().nullish(),
	releaseDate: z.string().nullish(),
	last_modified: z.string(),
	rating: z.string(),
	rating_5based: z.number(),
	backdrop_path: z.array(z.string().nullish()).nullish(),
	youtube_trailer: z.string().nullish(),
	episode_run_time: z.string(),
	category_id: z.string(),
	category_ids: z.array(z.number()),
});

export const externalSeriesListSchema = z.array(externalSeriesItemSchema);
export type ExternalSeriesItem = z.infer<typeof externalSeriesItemSchema>;
