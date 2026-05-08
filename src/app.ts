import { cors } from "@elysia/cors";
import { Elysia } from "elysia";
import type { Container } from "./container";
import { catalogRateLimitBeforeHandle } from "./http/plugins/catalog-rate-limit";
import { mapErrorToProblem, PROBLEM_JSON_HEADERS } from "./lib/errors";
import { logger } from "./lib/logger";
import { createCatalogModule } from "./modules/catalog";

function parseAllowedOrigins(raw: string): string | string[] {
	if (!raw.trim()) {
		return ["http://localhost:3001"];
	}
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

function requestIdFrom(request: Request): string {
	const incoming = request.headers.get("x-request-id")?.trim();
	return incoming && incoming.length > 0 ? incoming : crypto.randomUUID();
}

export function createApp(container: Container) {
	const { env, auth, catalogService, syncJobs, openapiPlugin, rateLimitStore } =
		container;

	const isProduction = env.NODE_ENV === "production";

	let app = new Elysia(isProduction ? { serve: { development: false } } : {})
		.derive(({ request }) => ({ reqId: requestIdFrom(request) }))
		.use(openapiPlugin)
		.use(
			cors({
				origin: parseAllowedOrigins(env.ALLOWED_ORIGINS),
				methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
				credentials: true,
				allowedHeaders: [
					"Content-Type",
					"Authorization",
					"X-Request-Id",
					"If-None-Match",
				],
				exposeHeaders: ["ETag", "Location", "X-Request-Id"],
			}),
		)
		.onBeforeHandle(async ({ request }) => {
			await catalogRateLimitBeforeHandle(rateLimitStore, request);
		})
		.get("/health", () =>
			Response.json(
				{ status: "ok" },
				{ headers: { "cache-control": "no-store" } },
			),
		)
		.get("/docs", ({ request }) => {
			const url = new URL(request.url);
			return Response.redirect(`${url.origin}/openapi`, 302);
		})
		.onRequest(({ request }) => {
			const path = new URL(request.url).pathname;
			if (path === "/health") {
				return;
			}
			const reqId = requestIdFrom(request);
			logger
				.child({ reqId })
				.info({ method: request.method, path: request.url }, "HTTP request");
		})
		.onError(({ code, error, request, reqId }) => {
			const rid = reqId ?? crypto.randomUUID();
			logger.error(
				{
					code,
					err: error,
					method: request.method,
					path: request.url,
					reqId: rid,
				},
				"HTTP error",
			);

			const problem = mapErrorToProblem({
				code,
				error,
				pathname: new URL(request.url).pathname,
				isProduction: env.NODE_ENV === "production",
				traceId: rid,
			});

			const headers: Record<string, string> = {
				...PROBLEM_JSON_HEADERS,
				"x-request-id": rid,
			};

			return Response.json(problem, {
				status: problem.status,
				headers,
			});
		})
		.get("/", () => "Hello Elysia")
		.group("/v1", (v1) =>
			v1.use(
				createCatalogModule(catalogService, {
					env,
					syncJobs,
				}),
			),
		);

	app = app.mount("/auth", auth.handler);

	return app;
}
