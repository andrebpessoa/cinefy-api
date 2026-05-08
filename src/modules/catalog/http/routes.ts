import { type AnyElysia, Elysia } from "elysia";
import { z } from "zod";
import type { Env } from "../../../config/env";
import { bearerTokensEqual } from "../../../lib/crypto/compare-bearer";
import {
	NotFoundAppError,
	ServiceUnavailableAppError,
	UnauthorizedAppError,
} from "../../../lib/errors";
import { getBearerToken } from "../../../lib/sync-api-key";
import type { CatalogSyncKind } from "../kinds/shared";
import type { CatalogServiceContract } from "../service";
import { runCatalogSyncIfIdle } from "../sync-coordinator";
import type { SyncJobsRepo } from "../sync-jobs.repo";
import {
	catalogListQuery,
	liveCatalogListResponseSchema,
	problemJsonResponseSchema,
	seriesCatalogListResponseSchema,
	syncJobAcceptedResponseSchema,
	syncJobIdParamsSchema,
	syncJobRecordResponseSchema,
	vodCatalogListResponseSchema,
} from "./schemas";

function assertSyncAuth(env: Env, request: Request) {
	const key = env.SYNC_API_KEY?.trim();
	if (!key) {
		throw new ServiceUnavailableAppError("SYNC_API_KEY is not configured");
	}
	const token = getBearerToken(request);
	if (!token || !bearerTokensEqual(token, key)) {
		throw new UnauthorizedAppError("Invalid or missing sync API credentials");
	}
}

export type CatalogRoutesDeps = {
	env: Env;
	syncJobs: SyncJobsRepo;
};

type SyncRouteDef = {
	kind: CatalogSyncKind;
	listPath: "/vod" | "/series" | "/live";
	runSync: (s: CatalogServiceContract) => Promise<void>;
	summarySync: string;
	descriptionSync: string;
	summaryJob: string;
};

const SYNC_ROUTE_DEFS: readonly SyncRouteDef[] = [
	{
		kind: "vod",
		listPath: "/vod",
		runSync: (s) => s.syncVodStreams(),
		summarySync: "Dispara sincronização VOD",
		descriptionSync:
			"Inicia sincronização assíncrona do catálogo VOD. Requer autenticação via SYNC_API_KEY.",
		summaryJob: "Estado de um job de sincronização VOD",
	},
	{
		kind: "series",
		listPath: "/series",
		runSync: (s) => s.syncSeriesStreams(),
		summarySync: "Dispara sincronização de séries",
		descriptionSync:
			"Inicia sincronização assíncrona do catálogo de séries. Requer autenticação via SYNC_API_KEY.",
		summaryJob: "Estado de um job de sincronização de séries",
	},
	{
		kind: "live",
		listPath: "/live",
		runSync: (s) => s.syncLiveStreams(),
		summarySync: "Dispara sincronização de canais ao vivo",
		descriptionSync:
			"Inicia sincronização assíncrona do catálogo ao vivo. Requer autenticação via SYNC_API_KEY.",
		summaryJob: "Estado de um job de sincronização ao vivo",
	},
];

function catalogListPayload<TItem, UItem>(
	query: { page: number; limit: number },
	request: Request,
	set: {
		status?: number | string;
		headers: Record<string, string | number | undefined>;
	},
	catalog: {
		items: TItem[];
		total: number;
		maxSyncedAt: Date | null;
	},
	syncState: Awaited<ReturnType<CatalogServiceContract["getSyncState"]>>,
	mapItem: (item: TItem) => UItem,
) {
	const totalPages = Math.ceil(catalog.total / query.limit);
	const etag = `W/"${catalog.maxSyncedAt?.getTime() ?? 0}:${catalog.total}"`;
	if (request.headers.get("if-none-match") === etag) {
		set.status = 304;
		set.headers.etag = etag;
		set.headers["cache-control"] =
			"public, max-age=30, stale-while-revalidate=300";
		return null;
	}
	set.headers.etag = etag;
	set.headers["cache-control"] =
		"public, max-age=30, stale-while-revalidate=300";

	return {
		items: catalog.items.map(mapItem),
		pagination: {
			page: query.page,
			limit: query.limit,
			totalItems: catalog.total,
			totalPages,
		},
		sync: {
			lastSuccessAt: syncState?.lastSuccessAt?.toISOString() ?? null,
			lastAttemptAt: syncState?.lastAttemptAt?.toISOString() ?? null,
			lastError: syncState?.lastError ?? null,
			lastItemCount: syncState?.lastItemCount ?? null,
		},
	};
}

export function createCatalogModule(
	service: CatalogServiceContract,
	deps: CatalogRoutesDeps,
) {
	const { env, syncJobs } = deps;

	return new Elysia({ prefix: "/catalog" })
		.get(
			"/vod",
			async ({ query, request, set }) => {
				const [catalog, syncState] = await Promise.all([
					service.getVodCatalog(query.page, query.limit),
					service.getSyncState("vod"),
				]);
				return catalogListPayload(
					query,
					request,
					set,
					catalog,
					syncState,
					(item) => ({
						...item,
						sourceUpdatedAt: item.sourceUpdatedAt?.toISOString() ?? null,
						syncedAt: item.syncedAt.toISOString(),
					}),
				);
			},
			{
				query: catalogListQuery,
				response: {
					200: vodCatalogListResponseSchema,
					304: z.null(),
				},
				detail: {
					tags: ["Catalog"],
					summary: "Lista o catálogo VOD",
					description:
						"Retorna itens VOD persistidos (campos alinhados ao armazenamento após o mapa do provider), com paginação e estado da última sincronização.",
				},
			},
		)
		.get(
			"/series",
			async ({ query, request, set }) => {
				const [catalog, syncState] = await Promise.all([
					service.getSeriesCatalog(query.page, query.limit),
					service.getSyncState("series"),
				]);
				return catalogListPayload(
					query,
					request,
					set,
					catalog,
					syncState,
					(item) => ({
						...item,
						sourceUpdatedAt: item.sourceUpdatedAt?.toISOString() ?? null,
						syncedAt: item.syncedAt.toISOString(),
					}),
				);
			},
			{
				query: catalogListQuery,
				response: {
					200: seriesCatalogListResponseSchema,
					304: z.null(),
				},
				detail: {
					tags: ["Catalog"],
					summary: "Lista o catálogo de séries",
					description:
						"Retorna séries persistidas (campos alinhados ao armazenamento após o mapa do provider), com paginação e estado da última sincronização.",
				},
			},
		)
		.get(
			"/live",
			async ({ query, request, set }) => {
				const [catalog, syncState] = await Promise.all([
					service.getLiveCatalog(query.page, query.limit),
					service.getSyncState("live"),
				]);
				return catalogListPayload(
					query,
					request,
					set,
					catalog,
					syncState,
					(item) => ({
						...item,
						syncedAt: item.syncedAt.toISOString(),
					}),
				);
			},
			{
				query: catalogListQuery,
				response: {
					200: liveCatalogListResponseSchema,
					304: z.null(),
				},
				detail: {
					tags: ["Catalog"],
					summary: "Lista canais ao vivo",
					description:
						"Retorna streams ao vivo persistidos (campos alinhados ao armazenamento após o mapa do provider), com paginação e estado da última sincronização.",
				},
			},
		)
		.guard(
			{
				beforeHandle: ({ request }) => assertSyncAuth(env, request),
			},
			(inner) =>
				SYNC_ROUTE_DEFS.reduce<AnyElysia>((acc: AnyElysia, k) => {
					return acc
						.post(
							`${k.listPath}/sync`,
							async ({ set }) => {
								const jobId = await syncJobs.create(k.kind);
								await syncJobs.markRunning(jobId);
								set.status = 202;
								set.headers.location = `/v1/catalog${k.listPath}/sync/jobs/${jobId}`;

								void runCatalogSyncIfIdle(
									() => k.runSync(service),
									"http-post",
									k.kind,
								)
									.then((outcome) =>
										outcome === "skipped"
											? syncJobs.markFailed(jobId, "Sync already in progress")
											: syncJobs.markSucceeded(jobId),
									)
									.catch((e) => {
										void syncJobs.markFailed(
											jobId,
											e instanceof Error ? e.message : "Unknown error",
										);
									});

								return { jobId };
							},
							{
								response: { 202: syncJobAcceptedResponseSchema },
								detail: {
									tags: ["Catalog"],
									summary: k.summarySync,
									description: k.descriptionSync,
								},
							},
						)
						.get(
							`${k.listPath}/sync/jobs/:id`,
							async ({ params }) => {
								const row = await syncJobs.getById(params.id);
								if (!row) throw new NotFoundAppError("Sync job", params.id);
								return row;
							},
							{
								params: syncJobIdParamsSchema,
								response: {
									200: syncJobRecordResponseSchema,
									404: problemJsonResponseSchema,
								},
								detail: {
									tags: ["Catalog"],
									summary: k.summaryJob,
								},
							},
						);
				}, inner),
		);
}
