import { z } from "zod";
import { internalCatalogItemSchema } from "../kinds/vod/model";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const catalogListQuery = z.object({
	page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
	limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

const vodCatalogItemResponseSchema = internalCatalogItemSchema
	.omit({ rawPayload: true })
	.extend({ id: z.number() });

const seriesCatalogItemResponseSchema = z.object({
	id: z.number(),
	externalId: z.number(),
	name: z.string(),
	title: z.string(),
	year: z.string().nullable(),
	streamType: z.string(),
	cover: z.string(),
	plot: z.string().nullable(),
	cast: z.string().nullable(),
	director: z.string().nullable(),
	genre: z.string().nullable(),
	releaseDate: z.string().nullable(),
	rating: z.string(),
	rating5based: z.number(),
	categoryId: z.string(),
	categoryIds: z.array(z.number()),
	backdropPath: z.array(z.string()),
	youtubeTrailer: z.string().nullable(),
	episodeRunTime: z.string(),
	lastModified: z.string(),
	sourceUpdatedAt: z.date().nullable(),
	syncedAt: z.date(),
});

const liveCatalogItemResponseSchema = z.object({
	id: z.number(),
	externalId: z.number(),
	name: z.string(),
	streamType: z.string(),
	streamIcon: z.string(),
	added: z.string(),
	customSid: z.string(),
	tvArchive: z.number(),
	tvArchiveDuration: z.number(),
	directSource: z.string(),
	categoryId: z.string(),
	categoryIds: z.array(z.number()),
	thumbnail: z.string(),
	epgChannelId: z.string().nullable(),
	syncedAt: z.date(),
});

const catalogPaginationResponseSchema = z.object({
	page: z.number(),
	limit: z.number(),
	totalItems: z.number(),
	totalPages: z.number(),
});

const catalogSyncMetaResponseSchema = z.object({
	lastSuccessAt: z.date().nullable(),
	lastAttemptAt: z.date().nullable(),
	lastError: z.string().nullable(),
	lastItemCount: z.number().nullable(),
});

export const vodCatalogListResponseSchema = z.object({
	items: z.array(vodCatalogItemResponseSchema),
	pagination: catalogPaginationResponseSchema,
	sync: catalogSyncMetaResponseSchema,
});

export const seriesCatalogListResponseSchema = z.object({
	items: z.array(seriesCatalogItemResponseSchema),
	pagination: catalogPaginationResponseSchema,
	sync: catalogSyncMetaResponseSchema,
});

export const liveCatalogListResponseSchema = z.object({
	items: z.array(liveCatalogItemResponseSchema),
	pagination: catalogPaginationResponseSchema,
	sync: catalogSyncMetaResponseSchema,
});

export const syncJobAcceptedResponseSchema = z.object({
	jobId: z.string().uuid(),
});

export const syncJobRecordResponseSchema = z.object({
	status: z.enum(["pending", "running", "succeeded", "failed"]),
	error: z.string().optional(),
	startedAt: z.iso.datetime(),
	finishedAt: z.iso.datetime().optional(),
});

export const problemJsonResponseSchema = z.object({
	type: z.string(),
	title: z.string(),
	detail: z.string(),
	status: z.number(),
	instance: z.string(),
	traceId: z.string().optional(),
});

export const syncJobIdParamsSchema = z.object({
	id: z.string().uuid(),
});
