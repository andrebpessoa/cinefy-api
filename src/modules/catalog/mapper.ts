import type { ExternalVodItem, InternalCatalogItem } from "./model";
import type { ExternalLiveStreamItem } from "./model-live";
import type { ExternalSeriesItem } from "./model-series";

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

export type InternalLiveStreamItem = {
	externalId: number;
	name: string;
	streamType: string;
	streamIcon: string;
	added: string;
	customSid: string;
	tvArchive: number;
	tvArchiveDuration: number;
	directSource: string;
	categoryId: string;
	categoryIds: number[];
	thumbnail: string;
	epgChannelId: string | null;
	rawPayload: Record<string, unknown>;
	syncedAt: Date;
};

export function mapVodItem(
	item: ExternalVodItem,
	syncedAt: Date,
): InternalCatalogItem {
	return {
		externalId: item.stream_id,
		name: item.name,
		title: item.title,
		year: item.year,
		streamType: item.stream_type,
		streamIcon: item.stream_icon,
		rating: item.rating,
		rating5based: item.rating_5based,
		added: item.added,
		categoryId: item.category_id,
		categoryIds: item.category_ids,
		containerExtension: item.container_extension,
		customSid: item.custom_sid,
		directSource: item.direct_source,
		rawPayload: item,
		sourceUpdatedAt: null,
		syncedAt,
	};
}

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

export function mapLiveItem(
	item: ExternalLiveStreamItem,
	syncedAt: Date,
): InternalLiveStreamItem {
	return {
		externalId: item.stream_id,
		name: item.name,
		streamType: item.stream_type,
		streamIcon: item.stream_icon,
		added: item.added,
		customSid: item.custom_sid,
		tvArchive: item.tv_archive,
		tvArchiveDuration: item.tv_archive_duration,
		directSource: item.direct_source,
		categoryId: item.category_id,
		categoryIds: item.category_ids,
		thumbnail: item.thumbnail,
		epgChannelId: item.epg_channel_id,
		rawPayload: item as Record<string, unknown>,
		syncedAt,
	};
}
