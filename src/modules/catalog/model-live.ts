import { z } from "zod";

export const externalLiveStreamItemSchema = z.object({
	num: z.number(),
	name: z.string(),
	stream_type: z.string(),
	stream_id: z.number(),
	stream_icon: z.string(),
	epg_channel_id: z.string().nullable(),
	added: z.string(),
	custom_sid: z.string(),
	tv_archive: z.number(),
	direct_source: z.string(),
	tv_archive_duration: z.number(),
	category_id: z.string(),
	category_ids: z.array(z.number()),
	thumbnail: z.string(),
});

export const externalLiveStreamListSchema = z.array(
	externalLiveStreamItemSchema,
);
export type ExternalLiveStreamItem = z.infer<
	typeof externalLiveStreamItemSchema
>;
