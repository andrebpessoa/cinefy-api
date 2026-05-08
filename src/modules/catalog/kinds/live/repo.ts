import { and, count, desc, isNotNull, isNull, lt } from "drizzle-orm";
import type { DbClient } from "../../../../db/client";
import { liveStreamItems } from "../../../../db/schema";

const active = isNull(liveStreamItems.deactivatedAt);

export function createLiveRepo(db: DbClient) {
	return {
		countActive: async () => {
			const [r] = await db
				.select({ total: count() })
				.from(liveStreamItems)
				.where(active);
			return r?.total ?? 0;
		},

		listActive: async (offset: number, limit: number) => {
			return db
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
				.where(active)
				.orderBy(desc(liveStreamItems.syncedAt))
				.limit(limit)
				.offset(offset);
		},

		maxSyncedAtActive: async () => {
			const rows = await db
				.select({ max: liveStreamItems.syncedAt })
				.from(liveStreamItems)
				.where(active)
				.orderBy(desc(liveStreamItems.syncedAt))
				.limit(1);
			return rows[0]?.max ?? null;
		},

		gcDeactivatedOlderThan: async (cutoff: Date) => {
			await db
				.delete(liveStreamItems)
				.where(
					and(
						isNotNull(liveStreamItems.deactivatedAt),
						lt(liveStreamItems.deactivatedAt, cutoff),
					),
				);
		},
	};
}
