import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createApp } from "./app";
import type { CatalogServiceContract } from "./modules/catalog/service";
import type { CatalogSyncKind } from "./modules/catalog/types";

function createCatalogServiceMock(): CatalogServiceContract {
	return {
		getVodCatalog: mock(async (page: number, limit: number) => ({
			items: [],
			total: page + limit,
		})),
		getSeriesCatalog: mock(async (page: number, limit: number) => ({
			items: [],
			total: page + limit,
		})),
		getLiveCatalog: mock(async (page: number, limit: number) => ({
			items: [],
			total: page + limit,
		})),
		getSyncState: mock(async (kind: CatalogSyncKind) => ({
			id: kind,
			lastAttemptAt: new Date("2026-01-01T00:00:00.000Z"),
			lastSuccessAt: null,
			lastError: null,
			lastItemCount: null,
		})),
		syncVodStreams: mock(async () => {}),
		syncSeriesStreams: mock(async () => {}),
		syncLiveStreams: mock(async () => {}),
	};
}

function syncHeaders(): HeadersInit {
	return {
		Authorization: "Bearer test-sync-key",
	};
}

describe("API app factory", () => {
	const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
	const originalSyncKey = process.env.SYNC_API_KEY;

	beforeEach(() => {
		process.env.NODE_ENV = "test";
		process.env.SYNC_API_KEY = "test-sync-key";
	});

	afterEach(() => {
		if (originalAllowedOrigins === undefined) {
			delete process.env.ALLOWED_ORIGINS;
		} else {
			process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
		}
		if (originalSyncKey === undefined) {
			delete process.env.SYNC_API_KEY;
		} else {
			process.env.SYNC_API_KEY = originalSyncKey;
		}
	});

	it("GET /health retorna 200", async () => {
		const app = createApp({ catalogService: createCatalogServiceMock() });
		const res = await app.handle(new Request("http://localhost/health"));
		expect(res.status).toBe(200);
		const body = (await res.json()) as { status: string };
		expect(body.status).toBe("ok");
	});

	it("retorna catalogo com servico injetado", async () => {
		const catalogServiceMock = createCatalogServiceMock();
		const app = createApp({ catalogService: catalogServiceMock });

		const response = await app.handle(
			new Request("http://localhost/catalog/vod?page=2&limit=5"),
		);
		const body = (await response.json()) as {
			pagination: { page: number; limit: number; totalItems: number };
		};

		expect(response.status).toBe(200);
		expect(body.pagination.page).toBe(2);
		expect(body.pagination.limit).toBe(5);
		expect(body.pagination.totalItems).toBe(7);
		expect(catalogServiceMock.getVodCatalog).toHaveBeenCalledWith(2, 5);
	});

	it("GET /catalog/series usa paginacao e getSeriesCatalog", async () => {
		const catalogServiceMock = createCatalogServiceMock();
		const app = createApp({ catalogService: catalogServiceMock });

		const response = await app.handle(
			new Request("http://localhost/catalog/series?page=1&limit=10"),
		);
		expect(response.status).toBe(200);
		expect(catalogServiceMock.getSeriesCatalog).toHaveBeenCalledWith(1, 10);
	});

	it("POST /catalog/live/sync retorna 202 e chama syncLiveStreams", async () => {
		const catalogServiceMock = createCatalogServiceMock();
		catalogServiceMock.syncLiveStreams = mock(async () => {
			await Bun.sleep(50);
		});
		const app = createApp({ catalogService: catalogServiceMock });

		const postRes = await app.handle(
			new Request("http://localhost/catalog/live/sync", {
				method: "POST",
				headers: syncHeaders(),
			}),
		);
		expect(postRes.status).toBe(202);
		const { jobId } = (await postRes.json()) as { jobId: string };

		await Bun.sleep(80);
		const finalRes = await app.handle(
			new Request(`http://localhost/catalog/live/sync/jobs/${jobId}`, {
				headers: syncHeaders(),
			}),
		);
		const finalJob = (await finalRes.json()) as { status: string };
		expect(finalJob.status).toBe("succeeded");
		expect(catalogServiceMock.syncLiveStreams).toHaveBeenCalled();
	});

	it("CORS permite origem listada em ALLOWED_ORIGINS", async () => {
		process.env.ALLOWED_ORIGINS = "http://localhost:3001,http://localhost:3000";
		const app = createApp({ catalogService: createCatalogServiceMock() });
		const res = await app.handle(
			new Request("http://localhost/catalog/vod", {
				headers: { Origin: "http://localhost:3000" },
			}),
		);
		expect(res.headers.get("access-control-allow-origin")).toBe(
			"http://localhost:3000",
		);
	});

	it("POST sync retorna 202 com jobId sem aguardar o sync", async () => {
		const catalogServiceMock = createCatalogServiceMock();
		catalogServiceMock.syncVodStreams = mock(async () => {
			await Bun.sleep(50);
		});
		const app = createApp({ catalogService: catalogServiceMock });

		const postRes = await app.handle(
			new Request("http://localhost/catalog/vod/sync", {
				method: "POST",
				headers: syncHeaders(),
			}),
		);
		expect(postRes.status).toBe(202);
		const postBody = (await postRes.json()) as { jobId: string };
		expect(typeof postBody.jobId).toBe("string");

		const getRes = await app.handle(
			new Request(`http://localhost/catalog/vod/sync/jobs/${postBody.jobId}`, {
				headers: syncHeaders(),
			}),
		);
		expect(getRes.status).toBe(200);
		const job = (await getRes.json()) as { status: string };
		expect(["pending", "running"]).toContain(job.status);

		await Bun.sleep(80);
		const finalRes = await app.handle(
			new Request(`http://localhost/catalog/vod/sync/jobs/${postBody.jobId}`, {
				headers: syncHeaders(),
			}),
		);
		const finalJob = (await finalRes.json()) as { status: string };
		expect(finalJob.status).toBe("succeeded");
		expect(catalogServiceMock.syncVodStreams).toHaveBeenCalled();
	});

	it("retorna erro de validacao para limite fora do range", async () => {
		const catalogServiceMock = createCatalogServiceMock();
		const app = createApp({ catalogService: catalogServiceMock });

		const response = await app.handle(
			new Request("http://localhost/catalog/vod?page=1&limit=999"),
		);
		const body = (await response.json()) as {
			title: string;
			status: number;
			type: string;
		};

		expect(response.status).toBe(400);
		expect(response.headers.get("content-type")).toContain(
			"application/problem+json",
		);
		expect(body.title).toBe("Validation Error");
		expect(body.status).toBe(400);
		expect(body.type).toBe("https://cinefy.dev/problems/validation-error");
		expect(catalogServiceMock.getVodCatalog).not.toHaveBeenCalled();
	});

	it("GET job inexistente retorna 404 problem+json", async () => {
		const app = createApp({ catalogService: createCatalogServiceMock() });
		const res = await app.handle(
			new Request(
				"http://localhost/catalog/vod/sync/jobs/00000000-0000-4000-8000-000000000001",
				{ headers: syncHeaders() },
			),
		);
		expect(res.status).toBe(404);
		expect(res.headers.get("content-type")).toContain(
			"application/problem+json",
		);
	});

	it("sync sem Bearer retorna 401", async () => {
		const app = createApp({ catalogService: createCatalogServiceMock() });
		const res = await app.handle(
			new Request("http://localhost/catalog/vod/sync", { method: "POST" }),
		);
		expect(res.status).toBe(401);
	});

	it("sync sem SYNC_API_KEY configurada retorna 503", async () => {
		delete process.env.SYNC_API_KEY;
		const app = createApp({ catalogService: createCatalogServiceMock() });
		const res = await app.handle(
			new Request("http://localhost/catalog/vod/sync", {
				method: "POST",
				headers: syncHeaders(),
			}),
		);
		expect(res.status).toBe(503);
	});

	it("job falha quando sync lanca e GET reflecte failed", async () => {
		const catalogServiceMock = createCatalogServiceMock();
		catalogServiceMock.syncVodStreams = mock(async () => {
			throw new Error("sync exploded");
		});
		const app = createApp({ catalogService: catalogServiceMock });

		const postRes = await app.handle(
			new Request("http://localhost/catalog/vod/sync", {
				method: "POST",
				headers: syncHeaders(),
			}),
		);
		expect(postRes.status).toBe(202);
		const { jobId } = (await postRes.json()) as { jobId: string };

		await Bun.sleep(30);
		const getRes = await app.handle(
			new Request(`http://localhost/catalog/vod/sync/jobs/${jobId}`, {
				headers: syncHeaders(),
			}),
		);
		expect(getRes.status).toBe(200);
		const job = (await getRes.json()) as { status: string; error?: string };
		expect(job.status).toBe("failed");
		expect(job.error).toBe("sync exploded");
	});
});
