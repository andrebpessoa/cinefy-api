import type { ExternalVodItem, InternalCatalogItem } from "./model";

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
