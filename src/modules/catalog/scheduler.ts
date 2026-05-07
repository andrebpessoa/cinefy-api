import { errorSummaryForLog } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { type CatalogServiceContract, catalogService } from "./service";
import { runCatalogSyncIfIdle } from "./sync-coordinator";
import type { CatalogSyncKind } from "./types";

const DEFAULT_CRON = "*/30 * * * *";

export function startCatalogScheduler(
	service: CatalogServiceContract = catalogService,
) {
	const schedule = process.env.CATALOG_SYNC_CRON?.trim() || DEFAULT_CRON;
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
			await runKind("vod", () => service.syncVodStreams());
			await runKind("series", () => service.syncSeriesStreams());
			await runKind("live", () => service.syncLiveStreams());
		})();
	});
}
