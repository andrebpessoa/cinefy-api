import { and, count, eq, isNull, notInArray, sql } from "drizzle-orm";
import type { Env } from "../../config/env";
import type { DbClient } from "../../db/client";
import {
	catalogSyncState,
	liveStreamItems,
	seriesItems,
	vodItems,
} from "../../db/schema";
import {
	CatalogPayloadEmptyAppError,
	errorSummaryForLog,
	SyncRetentionGuardAppError,
} from "../../lib/errors";
import { logger } from "../../lib/logger";
import { mapLiveItem } from "./kinds/live/mapper";
import { getLiveStreams } from "./kinds/live/provider";
import { createLiveRepo } from "./kinds/live/repo";
import { mapSeriesItem } from "./kinds/series/mapper";
import { getSeriesStreams } from "./kinds/series/provider";
import { createSeriesRepo } from "./kinds/series/repo";
import type { CatalogSyncKind } from "./kinds/shared";
import { mapVodItem } from "./kinds/vod/mapper";
import { getVodStreams } from "./kinds/vod/provider";
import { createVodRepo } from "./kinds/vod/repo";

const INSERT_BATCH_SIZE = 1000;
const GC_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

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
		maxSyncedAt: Date | null;
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
		maxSyncedAt: Date | null;
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
		maxSyncedAt: Date | null;
	}>;
	getSyncState(
		kind: CatalogSyncKind,
	): Promise<typeof catalogSyncState.$inferSelect | null>;
	syncVodStreams(): Promise<void>;
	syncSeriesStreams(): Promise<void>;
	syncLiveStreams(): Promise<void>;
};

export function createCatalogService(deps: {
	db: DbClient;
	env: Env;
}): CatalogServiceContract {
	const { db, env } = deps;
	const vodRepo = createVodRepo(db);
	const seriesRepo = createSeriesRepo(db);
	const liveRepo = createLiveRepo(db);

	async function getVodCatalog(page: number, limit: number) {
		const offset = (page - 1) * limit;
		const [items, total, maxSyncedAt] = await Promise.all([
			vodRepo.listActive(offset, limit),
			vodRepo.countActive(),
			vodRepo.maxSyncedAtActive(),
		]);
		return { items, total, maxSyncedAt };
	}

	async function getSeriesCatalog(page: number, limit: number) {
		const offset = (page - 1) * limit;
		const [items, total, maxSyncedAt] = await Promise.all([
			seriesRepo.listActive(offset, limit),
			seriesRepo.countActive(),
			seriesRepo.maxSyncedAtActive(),
		]);
		return { items, total, maxSyncedAt };
	}

	async function getLiveCatalog(page: number, limit: number) {
		const offset = (page - 1) * limit;
		const [items, total, maxSyncedAt] = await Promise.all([
			liveRepo.listActive(offset, limit),
			liveRepo.countActive(),
			liveRepo.maxSyncedAtActive(),
		]);
		return { items, total, maxSyncedAt };
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

	async function gcDeactivated() {
		const cutoff = new Date(Date.now() - GC_RETENTION_MS);
		await Promise.all([
			vodRepo.gcDeactivatedOlderThan(cutoff),
			seriesRepo.gcDeactivatedOlderThan(cutoff),
			liveRepo.gcDeactivatedOlderThan(cutoff),
		]);
	}

	type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

	async function executeCatalogSync<
		T extends { externalId: number; syncedAt: Date },
	>(opts: {
		kind: CatalogSyncKind;
		emptyLabel: string;
		fetchMapped: () => Promise<T[]>;
		runInTransaction: (
			tx: Tx,
			ctx: {
				mappedItems: T[];
				externalIds: number[];
				syncedAt: Date;
				minFrac: number;
			},
		) => Promise<void>;
	}) {
		const { kind, emptyLabel, fetchMapped, runInTransaction } = opts;
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
			const mappedItems = await fetchMapped();
			logger.info(
				{ kind, totalFetched: mappedItems.length },
				"Catalog provider fetch completed",
			);
			if (mappedItems.length === 0) {
				throw new CatalogPayloadEmptyAppError(emptyLabel);
			}
			const externalIds = mappedItems.map((m) => m.externalId);
			const minFrac = env.CATALOG_SYNC_MIN_RETENTION_FRACTION;
			const first = mappedItems[0];
			if (!first) {
				throw new CatalogPayloadEmptyAppError(emptyLabel);
			}
			const syncedAt = first.syncedAt;

			await db.transaction(async (tx) => {
				await runInTransaction(tx, {
					mappedItems,
					externalIds,
					syncedAt,
					minFrac,
				});
			});

			await gcDeactivated();

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

	async function syncVodStreams() {
		return executeCatalogSync({
			kind: "vod",
			emptyLabel: "vod",
			fetchMapped: async () => {
				const externalItems = await fetchWithRetry(2, "vod", () =>
					getVodStreams(),
				);
				const syncedAt = new Date();
				return dedupeByExternalId(
					externalItems.map((item) => mapVodItem(item, syncedAt)),
				);
			},
			runInTransaction: async (
				tx,
				{ mappedItems, externalIds, syncedAt, minFrac },
			) => {
				const [prevRow] = await tx
					.select({ total: count() })
					.from(vodItems)
					.where(isNull(vodItems.deactivatedAt));
				const prevCount = prevRow?.total ?? 0;
				if (prevCount > 0 && mappedItems.length < prevCount * minFrac) {
					throw new SyncRetentionGuardAppError(
						`Sync aborted: new batch size ${mappedItems.length} is below ${minFrac * 100}% of previous active count ${prevCount}`,
					);
				}

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
								deactivatedAt: sql`NULL`,
							},
						});
				}

				await tx
					.update(vodItems)
					.set({ deactivatedAt: syncedAt })
					.where(
						and(
							isNull(vodItems.deactivatedAt),
							notInArray(vodItems.externalId, externalIds),
						),
					);
			},
		});
	}

	async function syncSeriesStreams() {
		return executeCatalogSync({
			kind: "series",
			emptyLabel: "series",
			fetchMapped: async () => {
				const externalItems = await fetchWithRetry(2, "series", () =>
					getSeriesStreams(),
				);
				const syncedAt = new Date();
				return dedupeByExternalId(
					externalItems.map((item) => mapSeriesItem(item, syncedAt)),
				);
			},
			runInTransaction: async (
				tx,
				{ mappedItems, externalIds, syncedAt, minFrac },
			) => {
				const [prevRow] = await tx
					.select({ total: count() })
					.from(seriesItems)
					.where(isNull(seriesItems.deactivatedAt));
				const prevCount = prevRow?.total ?? 0;
				if (prevCount > 0 && mappedItems.length < prevCount * minFrac) {
					throw new SyncRetentionGuardAppError(
						`Sync aborted: new batch size ${mappedItems.length} is below ${minFrac * 100}% of previous active count ${prevCount}`,
					);
				}

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
								deactivatedAt: sql`NULL`,
							},
						});
				}

				await tx
					.update(seriesItems)
					.set({ deactivatedAt: syncedAt })
					.where(
						and(
							isNull(seriesItems.deactivatedAt),
							notInArray(seriesItems.externalId, externalIds),
						),
					);
			},
		});
	}

	async function syncLiveStreams() {
		return executeCatalogSync({
			kind: "live",
			emptyLabel: "live",
			fetchMapped: async () => {
				const externalItems = await fetchWithRetry(2, "live", () =>
					getLiveStreams(),
				);
				const syncedAt = new Date();
				return dedupeByExternalId(
					externalItems.map((item) => mapLiveItem(item, syncedAt)),
				);
			},
			runInTransaction: async (
				tx,
				{ mappedItems, externalIds, syncedAt, minFrac },
			) => {
				const [prevRow] = await tx
					.select({ total: count() })
					.from(liveStreamItems)
					.where(isNull(liveStreamItems.deactivatedAt));
				const prevCount = prevRow?.total ?? 0;
				if (prevCount > 0 && mappedItems.length < prevCount * minFrac) {
					throw new SyncRetentionGuardAppError(
						`Sync aborted: new batch size ${mappedItems.length} is below ${minFrac * 100}% of previous active count ${prevCount}`,
					);
				}

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
								deactivatedAt: sql`NULL`,
							},
						});
				}

				await tx
					.update(liveStreamItems)
					.set({ deactivatedAt: syncedAt })
					.where(
						and(
							isNull(liveStreamItems.deactivatedAt),
							notInArray(liveStreamItems.externalId, externalIds),
						),
					);
			},
		});
	}

	return {
		getVodCatalog,
		getSeriesCatalog,
		getLiveCatalog,
		getSyncState,
		syncVodStreams,
		syncSeriesStreams,
		syncLiveStreams,
	};
}
