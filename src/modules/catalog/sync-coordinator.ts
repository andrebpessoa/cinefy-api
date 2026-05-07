import { logger } from "../../lib/logger";
import type { CatalogSyncKind } from "./types";

const syncBusy: Record<CatalogSyncKind, boolean> = {
	vod: false,
	series: false,
	live: false,
};

export type RunOutcome = "ran" | "skipped";

export async function runCatalogSyncIfIdle(
	fn: () => Promise<void>,
	context: string,
	kind: CatalogSyncKind,
): Promise<RunOutcome> {
	if (syncBusy[kind]) {
		logger.warn({ context, kind }, "Catalog sync skipped (already running)");
		return "skipped";
	}
	syncBusy[kind] = true;
	try {
		await fn();
		return "ran";
	} finally {
		syncBusy[kind] = false;
	}
}
