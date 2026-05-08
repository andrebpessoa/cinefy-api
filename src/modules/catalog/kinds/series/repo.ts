import { and, count, desc, isNotNull, isNull, lt } from "drizzle-orm";
import type { DbClient } from "../../../../db/client";
import { seriesItems } from "../../../../db/schema";

const active = isNull(seriesItems.deactivatedAt);

export function createSeriesRepo(db: DbClient) {
	return {
		countActive: async () => {
			const [r] = await db
				.select({ total: count() })
				.from(seriesItems)
				.where(active);
			return r?.total ?? 0;
		},

		listActive: async (offset: number, limit: number) => {
			return db
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
				.where(active)
				.orderBy(desc(seriesItems.syncedAt))
				.limit(limit)
				.offset(offset);
		},

		maxSyncedAtActive: async () => {
			const rows = await db
				.select({ max: seriesItems.syncedAt })
				.from(seriesItems)
				.where(active)
				.orderBy(desc(seriesItems.syncedAt))
				.limit(1);
			return rows[0]?.max ?? null;
		},

		gcDeactivatedOlderThan: async (cutoff: Date) => {
			await db
				.delete(seriesItems)
				.where(
					and(
						isNotNull(seriesItems.deactivatedAt),
						lt(seriesItems.deactivatedAt, cutoff),
					),
				);
		},
	};
}
