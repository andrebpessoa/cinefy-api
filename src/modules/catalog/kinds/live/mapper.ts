import type { ExternalLiveStreamItem } from "./model";

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
