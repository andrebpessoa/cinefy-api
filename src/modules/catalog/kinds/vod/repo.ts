import { and, count, desc, isNotNull, isNull, lt } from "drizzle-orm";
import type { DbClient } from "../../../../db/client";
import { vodItems } from "../../../../db/schema";

const active = isNull(vodItems.deactivatedAt);

export function createVodRepo(db: DbClient) {
	return {
		countActive: async () => {
			const [r] = await db
				.select({ total: count() })
				.from(vodItems)
				.where(active);
			return r?.total ?? 0;
		},

		listActive: async (offset: number, limit: number) => {
			return db
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
				.where(active)
				.orderBy(desc(vodItems.syncedAt))
				.limit(limit)
				.offset(offset);
		},

		maxSyncedAtActive: async () => {
			const rows = await db
				.select({ max: vodItems.syncedAt })
				.from(vodItems)
				.where(active)
				.orderBy(desc(vodItems.syncedAt))
				.limit(1);
			return rows[0]?.max ?? null;
		},

		gcDeactivatedOlderThan: async (cutoff: Date) => {
			await db
				.delete(vodItems)
				.where(
					and(
						isNotNull(vodItems.deactivatedAt),
						lt(vodItems.deactivatedAt, cutoff),
					),
				);
		},
	};
}
