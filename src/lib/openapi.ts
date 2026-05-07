import { openapi } from "@elysia/openapi";
import Elysia from "elysia";
import { auth } from "./auth";

type OpenApiSchema = Awaited<ReturnType<typeof auth.api.generateOpenAPISchema>>;
type OpenApiPaths = OpenApiSchema["paths"];
type OpenApiComponents = OpenApiSchema["components"];

let _schema: Promise<OpenApiSchema>;
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema());

function isOperationObject(value: unknown): value is { tags?: string[] } {
	return typeof value === "object" && value !== null;
}

export const OpenAPI = {
	getPaths: (prefix = "/auth/api") =>
		getSchema().then(({ paths }) => {
			const reference: OpenApiPaths = Object.create(null) as OpenApiPaths;
			for (const path of Object.keys(paths)) {
				const key = prefix + path;
				reference[key] = paths[path];
				const pathItem = paths[path];
				if (typeof pathItem !== "object" || pathItem === null) {
					continue;
				}

				for (const method of Object.keys(pathItem)) {
					const operation = (reference[key] as Record<string, unknown>)[method];
					if (isOperationObject(operation)) {
						operation.tags = ["Better Auth"];
					}
				}
			}
			return reference;
		}) as Promise<OpenApiPaths>,
	components: getSchema().then(
		({ components }) => components,
	) as Promise<OpenApiComponents>,
} as const;

export const openapiPlugin = new Elysia().use(
	openapi({
		documentation: {
			components: await OpenAPI.components,
			paths: await OpenAPI.getPaths(),
		},
	} as Parameters<typeof openapi>[0]),
);
