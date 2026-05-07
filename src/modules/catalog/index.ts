import { Elysia } from "elysia";
import { z } from "zod";
import { PROBLEM_JSON_HEADERS } from "../../lib/errors";
import { getBearerToken } from "../../lib/sync-api-key";
import { type CatalogServiceContract, catalogService } from "./service";
import { runCatalogSyncIfIdle } from "./sync-coordinator";
import {
	createJob,
	getJob,
	markJobFailed,
	markJobRunning,
	markJobSucceeded,
} from "./sync-jobs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const catalogListQuery = z.object({
	page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
	limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

function problemResponse(
	status: number,
	body: {
		type: string;
		title: string;
		detail: string;
		instance: string;
	},
) {
	return Response.json(
		{ ...body, status },
		{ status, headers: PROBLEM_JSON_HEADERS },
	);
}

function syncBeforeHandle(request: Request): Response | undefined {
	const pathname = new URL(request.url).pathname;
	const key = process.env.SYNC_API_KEY?.trim();
	if (!key) {
		return problemResponse(503, {
			type: "https://cinefy.dev/problems/service-unavailable",
			title: "Service Unavailable",
			detail: "SYNC_API_KEY is not configured",
			instance: pathname,
		});
	}
	if (getBearerToken(request) !== key) {
		return problemResponse(401, {
			type: "https://cinefy.dev/problems/unauthorized",
			title: "Unauthorized",
			detail: "Invalid or missing sync API credentials",
			instance: pathname,
		});
	}
	return undefined;
}

export function createCatalogModule(service: CatalogServiceContract) {
	return new Elysia({ prefix: "/catalog" })
		.get(
			"/vod",
			async ({ query }) => {
				const [catalog, syncState] = await Promise.all([
					service.getVodCatalog(query.page, query.limit),
					service.getSyncState("vod"),
				]);
				const totalPages = Math.ceil(catalog.total / query.limit);

				return {
					items: catalog.items,
					pagination: {
						page: query.page,
						limit: query.limit,
						totalItems: catalog.total,
						totalPages,
					},
					sync: {
						lastSuccessAt: syncState?.lastSuccessAt ?? null,
						lastAttemptAt: syncState?.lastAttemptAt ?? null,
						lastError: syncState?.lastError ?? null,
						lastItemCount: syncState?.lastItemCount ?? null,
					},
				};
			},
			{
				query: catalogListQuery,
			},
		)
		.get(
			"/series",
			async ({ query }) => {
				const [catalog, syncState] = await Promise.all([
					service.getSeriesCatalog(query.page, query.limit),
					service.getSyncState("series"),
				]);
				const totalPages = Math.ceil(catalog.total / query.limit);

				return {
					items: catalog.items,
					pagination: {
						page: query.page,
						limit: query.limit,
						totalItems: catalog.total,
						totalPages,
					},
					sync: {
						lastSuccessAt: syncState?.lastSuccessAt ?? null,
						lastAttemptAt: syncState?.lastAttemptAt ?? null,
						lastError: syncState?.lastError ?? null,
						lastItemCount: syncState?.lastItemCount ?? null,
					},
				};
			},
			{
				query: catalogListQuery,
			},
		)
		.get(
			"/live",
			async ({ query }) => {
				const [catalog, syncState] = await Promise.all([
					service.getLiveCatalog(query.page, query.limit),
					service.getSyncState("live"),
				]);
				const totalPages = Math.ceil(catalog.total / query.limit);

				return {
					items: catalog.items,
					pagination: {
						page: query.page,
						limit: query.limit,
						totalItems: catalog.total,
						totalPages,
					},
					sync: {
						lastSuccessAt: syncState?.lastSuccessAt ?? null,
						lastAttemptAt: syncState?.lastAttemptAt ?? null,
						lastError: syncState?.lastError ?? null,
						lastItemCount: syncState?.lastItemCount ?? null,
					},
				};
			},
			{
				query: catalogListQuery,
			},
		)
		.guard(
			{
				beforeHandle: ({ request }) => syncBeforeHandle(request),
			},
			(app) =>
				app
					.post("/vod/sync", ({ set }) => {
						const jobId = createJob();
						markJobRunning(jobId);
						set.status = 202;

						void runCatalogSyncIfIdle(
							() => service.syncVodStreams(),
							"http-post",
							"vod",
						)
							.then((outcome) =>
								outcome === "skipped"
									? markJobFailed(jobId, "Sync already in progress")
									: markJobSucceeded(jobId),
							)
							.catch((e) => {
								markJobFailed(
									jobId,
									e instanceof Error ? e.message : "Unknown error",
								);
							});

						return { jobId };
					})
					.get(
						"/vod/sync/jobs/:id",
						({ params }) =>
							getJob(params.id) ??
							problemResponse(404, {
								type: "https://cinefy.dev/problems/not-found",
								title: "Resource Not Found",
								detail: "Sync job not found",
								instance: `/catalog/vod/sync/jobs/${params.id}`,
							}),
						{
							params: z.object({
								id: z.string().uuid(),
							}),
						},
					)
					.post("/series/sync", ({ set }) => {
						const jobId = createJob();
						markJobRunning(jobId);
						set.status = 202;

						void runCatalogSyncIfIdle(
							() => service.syncSeriesStreams(),
							"http-post",
							"series",
						)
							.then((outcome) =>
								outcome === "skipped"
									? markJobFailed(jobId, "Sync already in progress")
									: markJobSucceeded(jobId),
							)
							.catch((e) => {
								markJobFailed(
									jobId,
									e instanceof Error ? e.message : "Unknown error",
								);
							});

						return { jobId };
					})
					.get(
						"/series/sync/jobs/:id",
						({ params }) =>
							getJob(params.id) ??
							problemResponse(404, {
								type: "https://cinefy.dev/problems/not-found",
								title: "Resource Not Found",
								detail: "Sync job not found",
								instance: `/catalog/series/sync/jobs/${params.id}`,
							}),
						{
							params: z.object({
								id: z.string().uuid(),
							}),
						},
					)
					.post("/live/sync", ({ set }) => {
						const jobId = createJob();
						markJobRunning(jobId);
						set.status = 202;

						void runCatalogSyncIfIdle(
							() => service.syncLiveStreams(),
							"http-post",
							"live",
						)
							.then((outcome) =>
								outcome === "skipped"
									? markJobFailed(jobId, "Sync already in progress")
									: markJobSucceeded(jobId),
							)
							.catch((e) => {
								markJobFailed(
									jobId,
									e instanceof Error ? e.message : "Unknown error",
								);
							});

						return { jobId };
					})
					.get(
						"/live/sync/jobs/:id",
						({ params }) =>
							getJob(params.id) ??
							problemResponse(404, {
								type: "https://cinefy.dev/problems/not-found",
								title: "Resource Not Found",
								detail: "Sync job not found",
								instance: `/catalog/live/sync/jobs/${params.id}`,
							}),
						{
							params: z.object({
								id: z.string().uuid(),
							}),
						},
					),
		);
}

export const catalogModule = createCatalogModule(catalogService);
