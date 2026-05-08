import { openapi } from "@elysia/openapi";
import Elysia from "elysia";
import type { AuthInstance } from "./auth";

export async function createOpenapiPlugin(auth: AuthInstance) {
	type OpenApiPaths = Awaited<
		ReturnType<typeof auth.api.generateOpenAPISchema>
	>["paths"];

	const { paths: rawPaths, components } =
		await auth.api.generateOpenAPISchema();

	function isOperationObject(value: unknown): value is { tags?: string[] } {
		return typeof value === "object" && value !== null;
	}

	function buildPaths(prefix: string, paths: OpenApiPaths): OpenApiPaths {
		const reference: OpenApiPaths = Object.create(null) as OpenApiPaths;
		for (const path of Object.keys(paths)) {
			const key = prefix + path;
			const item = paths[path];
			if (item === undefined) continue;
			reference[key] = item;
			if (typeof item !== "object" || item === null) {
				continue;
			}

			for (const method of Object.keys(item)) {
				const operation = (item as Record<string, unknown>)[method];
				if (isOperationObject(operation)) {
					operation.tags = ["Better Auth"];
				}
			}
		}
		return reference;
	}

	return new Elysia().use(
		openapi({
			documentation: {
				components,
				paths: buildPaths("/auth/api", rawPaths),
				info: {
					title: "Cinefy API",
					version: "1.0.0",
				},
			},
		} as Parameters<typeof openapi>[0]),
	);
}
