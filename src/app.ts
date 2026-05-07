import { cors } from "@elysia/cors";
import { Elysia } from "elysia";
import { mapErrorToProblem, PROBLEM_JSON_HEADERS } from "./lib/errors";
import { logger } from "./lib/logger";
import { openapiPlugin } from "./lib/openapi";
import { catalogModule, createCatalogModule } from "./modules/catalog";
import type { CatalogServiceContract } from "./modules/catalog/service";

function parseAllowedOrigins(): string | string[] {
	const raw = process.env.ALLOWED_ORIGINS;
	if (!raw?.trim()) {
		return ["http://localhost:3001"];
	}
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

type CreateAppOptions = {
	catalogService?: CatalogServiceContract;
	authHandler?: (request: Request) => Response | Promise<Response>;
};

export function createApp(options: CreateAppOptions = {}) {
	const { catalogService, authHandler } = options;

	const isProduction = process.env.NODE_ENV === "production";

	const app = new Elysia(isProduction ? { serve: { development: false } } : {})
		.use(openapiPlugin)
		.use(
			cors({
				origin: parseAllowedOrigins(),
				methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
				credentials: true,
				allowedHeaders: ["Content-Type", "Authorization"],
			}),
		)
		.get("/health", () =>
			Response.json(
				{ status: "ok" },
				{ headers: { "cache-control": "no-store" } },
			),
		)
		.onRequest(({ request }) => {
			const path = new URL(request.url).pathname;
			if (path === "/health") {
				return;
			}
			const reqId = crypto.randomUUID();
			logger
				.child({ reqId })
				.info({ method: request.method, path: request.url }, "HTTP request");
		})
		.onError(({ code, error, request }) => {
			logger.error(
				{ code, err: error, method: request.method, path: request.url },
				"HTTP error",
			);

			const problem = mapErrorToProblem({
				code,
				error,
				pathname: new URL(request.url).pathname,
				isProduction: process.env.NODE_ENV === "production",
			});

			return Response.json(problem, {
				status: problem.status,
				headers: PROBLEM_JSON_HEADERS,
			});
		})
		.get("/", () => "Hello Elysia")
		.use(catalogService ? createCatalogModule(catalogService) : catalogModule);

	if (authHandler) {
		app.mount("/auth", authHandler);
	}

	return app;
}
