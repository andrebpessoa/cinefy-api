import { errorSummaryForLog } from "../../lib/errors";
import { logger } from "../../lib/logger";
import type { CatalogSyncKind } from "./kinds/shared";
import type { CatalogServiceContract } from "./service";
import { runCatalogSyncIfIdle } from "./sync-coordinator";

const DEFAULT_CRON = "*/30 * * * *";

export type SchedulerOptions = {
	schedule?: string;
};

export function startCatalogScheduler(
	service: CatalogServiceContract,
	options?: SchedulerOptions,
) {
	const schedule =
		options?.schedule?.trim() ||
		process.env.CATALOG_SYNC_CRON?.trim() ||
		DEFAULT_CRON;
	logger.info({ schedule }, "Catalog Bun.cron scheduler started");

	return Bun.cron(schedule, () => {
		const runKind = async (kind: CatalogSyncKind, fn: () => Promise<void>) => {
			try {
				await runCatalogSyncIfIdle(fn, "bun-cron", kind);
			} catch (error) {
				const summary = errorSummaryForLog(error);
				logger.error(
					{
						kind,
						errorName: summary.name,
						errorMessage: summary.message,
					},
					"Scheduled catalog sync failed",
				);
			}
		};

		void (async () => {
			await Promise.allSettled([
				runKind("vod", () => service.syncVodStreams()),
				runKind("series", () => service.syncSeriesStreams()),
				runKind("live", () => service.syncLiveStreams()),
			]);
		})();
	});
}
