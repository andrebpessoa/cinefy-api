import { eq } from "drizzle-orm";
import type { DbClient } from "../../db/client";
import { catalogSyncJobs } from "../../db/schema";
import type { CatalogSyncKind } from "./kinds/shared";

export type JobStatus = "pending" | "running" | "succeeded" | "failed";

export type SyncJobRecord = {
	status: JobStatus;
	error?: string;
	startedAt: string;
	finishedAt?: string;
};

export function createSyncJobsRepo(db: DbClient) {
	return {
		async create(kind: CatalogSyncKind): Promise<string> {
			const id = crypto.randomUUID();
			await db.insert(catalogSyncJobs).values({
				id,
				kind,
				status: "pending",
				startedAt: new Date(),
			});
			return id;
		},

		async markRunning(id: string) {
			await db
				.update(catalogSyncJobs)
				.set({ status: "running" })
				.where(eq(catalogSyncJobs.id, id));
		},

		async markSucceeded(id: string) {
			await db
				.update(catalogSyncJobs)
				.set({ status: "succeeded", finishedAt: new Date(), error: null })
				.where(eq(catalogSyncJobs.id, id));
		},

		async markFailed(id: string, message: string) {
			await db
				.update(catalogSyncJobs)
				.set({ status: "failed", finishedAt: new Date(), error: message })
				.where(eq(catalogSyncJobs.id, id));
		},

		async getById(id: string): Promise<SyncJobRecord | undefined> {
			const rows = await db
				.select()
				.from(catalogSyncJobs)
				.where(eq(catalogSyncJobs.id, id))
				.limit(1);
			const row = rows[0];
			if (!row) return undefined;
			return {
				status: row.status as JobStatus,
				error: row.error ?? undefined,
				startedAt: row.startedAt.toISOString(),
				finishedAt: row.finishedAt?.toISOString(),
			};
		},
	};
}

export type SyncJobsRepo = ReturnType<typeof createSyncJobsRepo>;
