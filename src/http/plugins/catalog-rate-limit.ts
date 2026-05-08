import { TooManyRequestsAppError } from "../../lib/errors";
import type { RateLimitStore } from "../../lib/rate-limit-store";
import { getBearerToken } from "../../lib/sync-api-key";

export const CATALOG_RATE_LIMIT_GET_WINDOW_MS = 60_000;
export const CATALOG_RATE_LIMIT_GET_MAX = 120;
export const CATALOG_RATE_LIMIT_SYNC_WINDOW_MS = 60_000;
export const CATALOG_RATE_LIMIT_SYNC_MAX = 6;

function clientIp(request: Request): string {
	const xf = request.headers.get("x-forwarded-for");
	if (xf) {
		const first = xf.split(",")[0]?.trim();
		if (first) return first;
	}
	return "unknown";
}

async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const buf = await crypto.subtle.digest("SHA-256", data);
	return [...new Uint8Array(buf)]
		.map((x) => x.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 32);
}

export async function catalogRateLimitBeforeHandle(
	store: RateLimitStore,
	request: Request,
): Promise<void> {
	const url = new URL(request.url);
	const path = url.pathname;
	if (!path.startsWith("/v1/catalog")) return;

	const listGet = /^\/v1\/catalog\/(vod|series|live)$/;
	const syncPost = /^\/v1\/catalog\/(vod|series|live)\/sync$/;

	if (request.method === "GET" && listGet.test(path)) {
		const n = await store.incrWithTtl(
			`cinefy:rl:cat:get:${clientIp(request)}`,
			CATALOG_RATE_LIMIT_GET_WINDOW_MS,
		);
		if (n > CATALOG_RATE_LIMIT_GET_MAX) {
			throw new TooManyRequestsAppError(
				`Too many requests for catalog:get window`,
			);
		}
		return;
	}

	if (request.method === "POST" && syncPost.test(path)) {
		const token = getBearerToken(request) ?? "";
		const tag = await sha256Hex(token);
		const n = await store.incrWithTtl(
			`cinefy:rl:cat:sync:${tag}`,
			CATALOG_RATE_LIMIT_SYNC_WINDOW_MS,
		);
		if (n > CATALOG_RATE_LIMIT_SYNC_MAX) {
			throw new TooManyRequestsAppError(
				`Too many requests for catalog:sync window`,
			);
		}
	}
}
