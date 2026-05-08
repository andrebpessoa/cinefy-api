import type { ExternalSeriesItem } from "./model";

export type InternalSeriesItem = {
	externalId: number;
	name: string;
	title: string;
	year: string | null;
	streamType: string;
	cover: string;
	plot: string | null;
	cast: string | null;
	director: string | null;
	genre: string | null;
	releaseDate: string | null;
	rating: string;
	rating5based: number;
	categoryId: string;
	categoryIds: number[];
	backdropPath: string[];
	youtubeTrailer: string | null;
	episodeRunTime: string;
	lastModified: string;
	rawPayload: Record<string, unknown>;
	sourceUpdatedAt: Date | null;
	syncedAt: Date;
};

function nullishText(v: string | null | undefined): string | null {
	if (v === undefined || v === null) return null;
	return v;
}

function seriesBackdropPath(
	paths: (string | null | undefined)[] | null | undefined,
): string[] {
	if (!paths?.length) return [];
	return paths.filter((p): p is string => p != null);
}

export function mapSeriesItem(
	item: ExternalSeriesItem,
	syncedAt: Date,
): InternalSeriesItem {
	return {
		externalId: item.series_id,
		name: item.name,
		title: item.title,
		year: nullishText(item.year),
		streamType: item.stream_type,
		cover: item.cover,
		plot: nullishText(item.plot),
		cast: nullishText(item.cast),
		director: nullishText(item.director),
		genre: nullishText(item.genre),
		releaseDate: nullishText(item.release_date ?? item.releaseDate),
		rating: item.rating,
		rating5based: item.rating_5based,
		categoryId: item.category_id,
		categoryIds: item.category_ids,
		backdropPath: seriesBackdropPath(item.backdrop_path),
		youtubeTrailer: nullishText(item.youtube_trailer),
		episodeRunTime: item.episode_run_time,
		lastModified: item.last_modified,
		rawPayload: item as Record<string, unknown>,
		sourceUpdatedAt: null,
		syncedAt,
	};
}
