import { z } from "zod";

export const externalVodItemSchema = z.object({
	num: z.number(),
	name: z.string(),
	title: z.string(),
	year: z.string().nullable(),
	stream_type: z.string(),
	stream_id: z.number(),
	stream_icon: z.string(),
	rating: z.number(),
	rating_5based: z.number(),
	added: z.string(),
	category_id: z.string(),
	category_ids: z.array(z.number()),
	container_extension: z.string().nullable(),
	custom_sid: z.string(),
	direct_source: z.string(),
});

export const externalVodListSchema = z.array(externalVodItemSchema);

export type ExternalVodItem = z.infer<typeof externalVodItemSchema>;

export const internalCatalogItemSchema = z.object({
	externalId: z.number(),
	name: z.string(),
	title: z.string(),
	year: z.string().nullable(),
	streamType: z.string(),
	streamIcon: z.string(),
	rating: z.number(),
	rating5based: z.number(),
	added: z.string(),
	categoryId: z.string(),
	categoryIds: z.array(z.number()),
	containerExtension: z.string().nullable(),
	customSid: z.string(),
	directSource: z.string(),
	rawPayload: z.record(z.string(), z.unknown()),
	sourceUpdatedAt: z.date().nullable(),
	syncedAt: z.date(),
});

export type InternalCatalogItem = z.infer<typeof internalCatalogItemSchema>;
