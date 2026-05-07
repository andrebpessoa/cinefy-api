import { createApp } from "./app";
import { auth } from "./lib/auth";
import { errorSummaryForLog } from "./lib/errors";
import { logger } from "./lib/logger";
import { startCatalogScheduler } from "./modules/catalog/scheduler";
import { catalogService } from "./modules/catalog/service";
import { runCatalogSyncIfIdle } from "./modules/catalog/sync-coordinator";

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";

const app = createApp({ authHandler: auth.handler }).listen({ port, hostname });
const cronJob = startCatalogScheduler(catalogService);

const startupSyncByKind = {
	vod: () => catalogService.syncVodStreams(),
	series: () => catalogService.syncSeriesStreams(),
	live: () => catalogService.syncLiveStreams(),
} satisfies Record<"vod" | "series" | "live", () => Promise<void>>;

const shutdown = () => {
	cronJob.stop();
	app.stop();
	process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

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
