import {
	type ExternalSeriesItem,
	externalSeriesListSchema,
} from "./model-series";

const DEV_FALLBACK_PROVIDER_URL = "http://localhost:9999/series-fixture";
const DEFAULT_PROVIDER_TIMEOUT_MS = 30000;

function toSafeProviderTarget(providerUrl: string) {
	try {
		const parsed = new URL(providerUrl);
		return `${parsed.origin}${parsed.pathname}`;
	} catch {
		return "invalid-provider-url";
	}
}

export async function getSeriesStreams(): Promise<ExternalSeriesItem[]> {
	const isProd = process.env.NODE_ENV === "production";
	const fromEnv = process.env.SERIES_PROVIDER_URL;
	if (isProd && !fromEnv?.trim()) {
		throw new Error("SERIES_PROVIDER_URL is required in production");
	}
	const providerUrl = fromEnv?.trim() || DEV_FALLBACK_PROVIDER_URL;
	const providerTimeoutMs = Number(
		process.env.CATALOG_PROVIDER_TIMEOUT_MS ?? DEFAULT_PROVIDER_TIMEOUT_MS,
	);
	const timeoutMs =
		Number.isFinite(providerTimeoutMs) && providerTimeoutMs > 0
			? providerTimeoutMs
			: DEFAULT_PROVIDER_TIMEOUT_MS;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		let response: Response;
		try {
			response = await fetch(providerUrl, {
				signal: controller.signal,
			});
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				throw new Error(
					`Provider request timed out after ${timeoutMs}ms (${toSafeProviderTarget(providerUrl)})`,
				);
			}
			throw error;
		}

		if (!response.ok) {
			throw new Error(`Provider request failed with status ${response.status}`);
		}

		const payload = await response.json();
		const parsed = externalSeriesListSchema.safeParse(payload);
		if (!parsed.success) {
			throw new Error("Provider payload does not match expected schema");
		}

		return parsed.data;
	} finally {
		clearTimeout(timeoutId);
	}
}
