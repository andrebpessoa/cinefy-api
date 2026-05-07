import { count, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
	catalogSyncState,
	liveStreamItems,
	seriesItems,
	vodItems,
} from "../../db/schema";
import { errorSummaryForLog } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { mapLiveItem, mapSeriesItem, mapVodItem } from "./mapper";
import { getVodStreams } from "./provider";
import { getLiveStreams } from "./provider-live";
import { getSeriesStreams } from "./provider-series";
import type { CatalogSyncKind } from "./types";

const INSERT_BATCH_SIZE = 1000;

function dedupeByExternalId<T extends { externalId: number }>(items: T[]): T[] {
	const byExternal = new Map<number, T>();
	for (const item of items) {
		byExternal.set(item.externalId, item);
	}
	return Array.from(byExternal.values());
}

export type CatalogServiceContract = {
	getVodCatalog(
		page: number,
		limit: number,
	): Promise<{
		items: Array<{
			id: number;
			externalId: number;
			name: string;
			title: string;
			year: string | null;
			streamType: string;
			streamIcon: string;
			rating: number;
			rating5based: number;
			added: string;
			categoryId: string;
			categoryIds: number[];
			containerExtension: string | null;
			customSid: string;
			directSource: string;
			sourceUpdatedAt: Date | null;
			syncedAt: Date;
		}>;
		total: number;
	}>;
	getSeriesCatalog(
		page: number,
		limit: number,
	): Promise<{
		items: Array<{
			id: number;
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
			sourceUpdatedAt: Date | null;
			syncedAt: Date;
		}>;
		total: number;
	}>;
	getLiveCatalog(
		page: number,
		limit: number,
	): Promise<{
		items: Array<{
			id: number;
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
			syncedAt: Date;
		}>;
		total: number;
	}>;
	getSyncState(
		kind: CatalogSyncKind,
	): Promise<typeof catalogSyncState.$inferSelect | null>;
	syncVodStreams(): Promise<void>;
	syncSeriesStreams(): Promise<void>;
	syncLiveStreams(): Promise<void>;
};

async function getVodCatalog(page: number, limit: number) {
	const offset = (page - 1) * limit;
	const [items, totalRows] = await Promise.all([
		db
			.select({
				id: vodItems.id,
				externalId: vodItems.externalId,
				name: vodItems.name,
				title: vodItems.title,
				year: vodItems.year,
				streamType: vodItems.streamType,
				streamIcon: vodItems.streamIcon,
				rating: vodItems.rating,
				rating5based: vodItems.rating5based,
				added: vodItems.added,
				categoryId: vodItems.categoryId,
				categoryIds: vodItems.categoryIds,
				containerExtension: vodItems.containerExtension,
				customSid: vodItems.customSid,
				directSource: vodItems.directSource,
				sourceUpdatedAt: vodItems.sourceUpdatedAt,
				syncedAt: vodItems.syncedAt,
			})
			.from(vodItems)
			.orderBy(desc(vodItems.syncedAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(vodItems),
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0,
	};
}

async function getSeriesCatalog(page: number, limit: number) {
	const offset = (page - 1) * limit;
	const [items, totalRows] = await Promise.all([
		db
			.select({
				id: seriesItems.id,
				externalId: seriesItems.externalId,
				name: seriesItems.name,
				title: seriesItems.title,
				year: seriesItems.year,
				streamType: seriesItems.streamType,
				cover: seriesItems.cover,
				plot: seriesItems.plot,
				cast: seriesItems.cast,
				director: seriesItems.director,
				genre: seriesItems.genre,
				releaseDate: seriesItems.releaseDate,
				rating: seriesItems.rating,
				rating5based: seriesItems.rating5based,
				categoryId: seriesItems.categoryId,
				categoryIds: seriesItems.categoryIds,
				backdropPath: seriesItems.backdropPath,
				youtubeTrailer: seriesItems.youtubeTrailer,
				episodeRunTime: seriesItems.episodeRunTime,
				lastModified: seriesItems.lastModified,
				sourceUpdatedAt: seriesItems.sourceUpdatedAt,
				syncedAt: seriesItems.syncedAt,
			})
			.from(seriesItems)
			.orderBy(desc(seriesItems.syncedAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(seriesItems),
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0,
	};
}

async function getLiveCatalog(page: number, limit: number) {
	const offset = (page - 1) * limit;
	const [items, totalRows] = await Promise.all([
		db
			.select({
				id: liveStreamItems.id,
				externalId: liveStreamItems.externalId,
				name: liveStreamItems.name,
				streamType: liveStreamItems.streamType,
				streamIcon: liveStreamItems.streamIcon,
				added: liveStreamItems.added,
				customSid: liveStreamItems.customSid,
				tvArchive: liveStreamItems.tvArchive,
				tvArchiveDuration: liveStreamItems.tvArchiveDuration,
				directSource: liveStreamItems.directSource,
				categoryId: liveStreamItems.categoryId,
				categoryIds: liveStreamItems.categoryIds,
				thumbnail: liveStreamItems.thumbnail,
				epgChannelId: liveStreamItems.epgChannelId,
				syncedAt: liveStreamItems.syncedAt,
			})
			.from(liveStreamItems)
			.orderBy(desc(liveStreamItems.syncedAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(liveStreamItems),
	]);

	return {
		items,
		total: totalRows[0]?.total ?? 0,
	};
}

async function getSyncState(kind: CatalogSyncKind) {
	const rows = await db
		.select()
		.from(catalogSyncState)
		.where(eq(catalogSyncState.id, kind))
		.limit(1);

	return rows[0] ?? null;
}

async function fetchWithRetry<T>(
	maxAttempts: number,
	kind: CatalogSyncKind,
	fetchFn: () => Promise<T>,
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			logger.debug(
				{ attempt, maxAttempts, kind },
				"Catalog provider fetch attempt",
			);
			return await fetchFn();
		} catch (error) {
			lastError =
				error instanceof Error ? error : new Error("Unknown sync error");
			logger.warn(
				{
					attempt,
					maxAttempts,
					kind,
					errorName: lastError.name,
					errorMessage: lastError.message,
				},
				"Catalog provider fetch attempt failed",
			);
			if (attempt < maxAttempts) {
				await Bun.sleep(500 * attempt);
			}
		}
	}

	throw lastError ?? new Error("Unknown sync error");
}

async function syncVodStreams() {
	const kind: CatalogSyncKind = "vod";
	const lastAttemptAt = new Date();
	const syncStartedAt = Date.now();
	logger.info(
		{ kind, lastAttemptAt: lastAttemptAt.toISOString() },
		"Catalog sync started",
	);
	await upsertSyncState(kind, {
		lastAttemptAt,
	});

	try {
		const externalItems = await fetchWithRetry(2, kind, () => getVodStreams());
		logger.info(
			{ kind, totalFetched: externalItems.length },
			"Catalog provider fetch completed",
		);
		const syncedAt = new Date();
		const mappedItems = dedupeByExternalId(
			externalItems.map((item) => mapVodItem(item, syncedAt)),
		);

		if (mappedItems.length === 0) {
			throw new Error("Provider returned empty vod list");
		}

		const externalIds = mappedItems.map((m) => m.externalId);

		await db.transaction(async (tx) => {
			for (let i = 0; i < mappedItems.length; i += INSERT_BATCH_SIZE) {
				const batch = mappedItems.slice(i, i + INSERT_BATCH_SIZE);
				await tx
					.insert(vodItems)
					.values(batch)
					.onConflictDoUpdate({
						target: vodItems.externalId,
						set: {
							name: sql`excluded.name`,
							title: sql`excluded.title`,
							year: sql`excluded.year`,
							streamType: sql`excluded.stream_type`,
							streamIcon: sql`excluded.stream_icon`,
							rating: sql`excluded.rating`,
							rating5based: sql`excluded.rating_5based`,
							added: sql`excluded.added`,
							categoryId: sql`excluded.category_id`,
							categoryIds: sql`excluded.category_ids`,
							containerExtension: sql`excluded.container_extension`,
							customSid: sql`excluded.custom_sid`,
							directSource: sql`excluded.direct_source`,
							rawPayload: sql`excluded.raw_payload`,
							sourceUpdatedAt: sql`excluded.source_updated_at`,
							syncedAt: sql`excluded.synced_at`,
						},
					});
			}
			await tx
				.delete(vodItems)
				.where(notInArray(vodItems.externalId, externalIds));
		});

		await upsertSyncState(kind, {
			lastAttemptAt,
			lastSuccessAt: syncedAt,
			lastError: null,
			lastItemCount: mappedItems.length,
		});
		logger.info(
			{
				kind,
				totalMapped: mappedItems.length,
				durationMs: Date.now() - syncStartedAt,
			},
			"Catalog sync completed",
		);
	} catch (error) {
		const summary = errorSummaryForLog(error);
		await upsertSyncState(kind, {
			lastAttemptAt,
			lastError: summary.message,
		});
		logger.error(
			{
				kind,
				durationMs: Date.now() - syncStartedAt,
				errorName: summary.name,
				errorMessage: summary.message,
				queryBindCount: summary.bindCount,
				queryPreview: summary.queryPreview,
			},
			"Catalog sync failed",
		);
		throw error;
	}
}

async function syncSeriesStreams() {
	const kind: CatalogSyncKind = "series";
	const lastAttemptAt = new Date();
	const syncStartedAt = Date.now();
	logger.info(
		{ kind, lastAttemptAt: lastAttemptAt.toISOString() },
		"Catalog sync started",
	);
	await upsertSyncState(kind, {
		lastAttemptAt,
	});

	try {
		const externalItems = await fetchWithRetry(2, kind, () =>
			getSeriesStreams(),
		);
		logger.info(
			{ kind, totalFetched: externalItems.length },
			"Catalog provider fetch completed",
		);
		const syncedAt = new Date();
		const mappedItems = dedupeByExternalId(
			externalItems.map((item) => mapSeriesItem(item, syncedAt)),
		);

		if (mappedItems.length === 0) {
			throw new Error("Provider returned empty series list");
		}

		const externalIds = mappedItems.map((m) => m.externalId);

		await db.transaction(async (tx) => {
			for (let i = 0; i < mappedItems.length; i += INSERT_BATCH_SIZE) {
				const batch = mappedItems.slice(i, i + INSERT_BATCH_SIZE);
				await tx
					.insert(seriesItems)
					.values(batch)
					.onConflictDoUpdate({
						target: seriesItems.externalId,
						set: {
							name: sql`excluded.name`,
							title: sql`excluded.title`,
							year: sql`excluded.year`,
							streamType: sql`excluded.stream_type`,
							cover: sql`excluded.cover`,
							plot: sql`excluded.plot`,
							cast: sql`excluded.cast`,
							director: sql`excluded.director`,
							genre: sql`excluded.genre`,
							releaseDate: sql`excluded.release_date`,
							rating: sql`excluded.rating`,
							rating5based: sql`excluded.rating_5based`,
							categoryId: sql`excluded.category_id`,
							categoryIds: sql`excluded.category_ids`,
							backdropPath: sql`excluded.backdrop_path`,
							youtubeTrailer: sql`excluded.youtube_trailer`,
							episodeRunTime: sql`excluded.episode_run_time`,
							lastModified: sql`excluded.last_modified`,
							rawPayload: sql`excluded.raw_payload`,
							sourceUpdatedAt: sql`excluded.source_updated_at`,
							syncedAt: sql`excluded.synced_at`,
						},
					});
			}
			await tx
				.delete(seriesItems)
				.where(notInArray(seriesItems.externalId, externalIds));
		});

		await upsertSyncState(kind, {
			lastAttemptAt,
			lastSuccessAt: syncedAt,
			lastError: null,
			lastItemCount: mappedItems.length,
		});
		logger.info(
			{
				kind,
				totalMapped: mappedItems.length,
				durationMs: Date.now() - syncStartedAt,
			},
			"Catalog sync completed",
		);
	} catch (error) {
		const summary = errorSummaryForLog(error);
		await upsertSyncState(kind, {
			lastAttemptAt,
			lastError: summary.message,
		});
		logger.error(
			{
				kind,
				durationMs: Date.now() - syncStartedAt,
				errorName: summary.name,
				errorMessage: summary.message,
				queryBindCount: summary.bindCount,
				queryPreview: summary.queryPreview,
			},
			"Catalog sync failed",
		);
		throw error;
	}
}

async function syncLiveStreams() {
	const kind: CatalogSyncKind = "live";
	const lastAttemptAt = new Date();
	const syncStartedAt = Date.now();
	logger.info(
		{ kind, lastAttemptAt: lastAttemptAt.toISOString() },
		"Catalog sync started",
	);
	await upsertSyncState(kind, {
		lastAttemptAt,
	});

	try {
		const externalItems = await fetchWithRetry(2, kind, () => getLiveStreams());
		logger.info(
			{ kind, totalFetched: externalItems.length },
			"Catalog provider fetch completed",
		);
		const syncedAt = new Date();
		const mappedItems = dedupeByExternalId(
			externalItems.map((item) => mapLiveItem(item, syncedAt)),
		);

		if (mappedItems.length === 0) {
			throw new Error("Provider returned empty live list");
		}

		const externalIds = mappedItems.map((m) => m.externalId);

		await db.transaction(async (tx) => {
			for (let i = 0; i < mappedItems.length; i += INSERT_BATCH_SIZE) {
				const batch = mappedItems.slice(i, i + INSERT_BATCH_SIZE);
				await tx
					.insert(liveStreamItems)
					.values(batch)
					.onConflictDoUpdate({
						target: liveStreamItems.externalId,
						set: {
							name: sql`excluded.name`,
							streamType: sql`excluded.stream_type`,
							streamIcon: sql`excluded.stream_icon`,
							added: sql`excluded.added`,
							customSid: sql`excluded.custom_sid`,
							tvArchive: sql`excluded.tv_archive`,
							tvArchiveDuration: sql`excluded.tv_archive_duration`,
							directSource: sql`excluded.direct_source`,
							categoryId: sql`excluded.category_id`,
							categoryIds: sql`excluded.category_ids`,
							thumbnail: sql`excluded.thumbnail`,
							epgChannelId: sql`excluded.epg_channel_id`,
							rawPayload: sql`excluded.raw_payload`,
							syncedAt: sql`excluded.synced_at`,
						},
					});
			}
			await tx
				.delete(liveStreamItems)
				.where(notInArray(liveStreamItems.externalId, externalIds));
		});

		await upsertSyncState(kind, {
			lastAttemptAt,
			lastSuccessAt: syncedAt,
			lastError: null,
			lastItemCount: mappedItems.length,
		});
		logger.info(
			{
				kind,
				totalMapped: mappedItems.length,
				durationMs: Date.now() - syncStartedAt,
			},
			"Catalog sync completed",
		);
	} catch (error) {
		const summary = errorSummaryForLog(error);
		await upsertSyncState(kind, {
			lastAttemptAt,
			lastError: summary.message,
		});
		logger.error(
			{
				kind,
				durationMs: Date.now() - syncStartedAt,
				errorName: summary.name,
				errorMessage: summary.message,
				queryBindCount: summary.bindCount,
				queryPreview: summary.queryPreview,
			},
			"Catalog sync failed",
		);
		throw error;
	}
}

async function upsertSyncState(
	kind: CatalogSyncKind,
	state: {
		lastAttemptAt: Date;
		lastSuccessAt?: Date;
		lastError?: string | null;
		lastItemCount?: number;
	},
) {
	await db
		.insert(catalogSyncState)
		.values({
			id: kind,
			lastAttemptAt: state.lastAttemptAt,
			lastSuccessAt: state.lastSuccessAt ?? null,
			lastError: state.lastError ?? null,
			lastItemCount: state.lastItemCount ?? null,
		})
		.onConflictDoUpdate({
			target: catalogSyncState.id,
			set: {
				lastAttemptAt: state.lastAttemptAt,
				lastSuccessAt:
					state.lastSuccessAt === undefined
						? catalogSyncState.lastSuccessAt
						: state.lastSuccessAt,
				lastError:
					state.lastError === undefined
						? catalogSyncState.lastError
						: state.lastError,
				lastItemCount:
					state.lastItemCount === undefined
						? catalogSyncState.lastItemCount
						: state.lastItemCount,
			},
		});
}

export const catalogService: CatalogServiceContract = {
	getVodCatalog,
	getSeriesCatalog,
	getLiveCatalog,
	getSyncState,
	syncVodStreams,
	syncSeriesStreams,
	syncLiveStreams,
};
