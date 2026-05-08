import "dotenv/config";
import { createApp } from "./app";
import { createContainer } from "./container";
import { errorSummaryForLog } from "./lib/errors";
import { logger } from "./lib/logger";
import { closeRedis } from "./lib/redis";
import { startCatalogScheduler } from "./modules/catalog/scheduler";
import { runCatalogSyncIfIdle } from "./modules/catalog/sync-coordinator";

const container = await createContainer();
const app = createApp(container).listen({
	port: container.env.PORT,
	hostname: container.env.HOST,
});

const cronJob = startCatalogScheduler(container.catalogService, {
	schedule: container.env.CATALOG_SYNC_CRON,
});

const startupSyncByKind = {
	vod: () => container.catalogService.syncVodStreams(),
	series: () => container.catalogService.syncSeriesStreams(),
	live: () => container.catalogService.syncLiveStreams(),
} satisfies Record<"vod" | "series" | "live", () => Promise<void>>;

const shutdown = async () => {
	cronJob.stop();
	app.stop();
	await Promise.all([
		container.pool.end().catch(() => {}),
		closeRedis(container.redis),
	]);
	process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

for (const kind of ["vod", "series", "live"] as const) {
	void runCatalogSyncIfIdle(startupSyncByKind[kind], "startup", kind).catch(
		(error) => {
			const summary = errorSummaryForLog(error);
			logger.error(
				{ kind, errorName: summary.name, errorMessage: summary.message },
				"Initial catalog sync failed",
			);
		},
	);
}

logger.info(
	{ host: app.server?.hostname, port: app.server?.port },
	"🚀 Elysia server started",
);
