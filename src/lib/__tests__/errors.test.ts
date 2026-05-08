import { describe, expect, it } from "bun:test";
import { extractValidationErrors, mapErrorToProblem } from "../errors";

const traceId = "test-trace-id";

describe("extractValidationErrors", () => {
	it("retorna lista vazia quando erro nao tem issues", () => {
		expect(extractValidationErrors({})).toEqual([]);
		expect(extractValidationErrors({ all: "invalid" })).toEqual([]);
	});

	it("normaliza path array para string", () => {
		const issues = extractValidationErrors({
			all: [{ path: ["query", "limit"], message: "too big" }],
		});

		expect(issues).toEqual([{ path: "query.limit", message: "too big" }]);
	});
});

describe("mapErrorToProblem", () => {
	it("mapeia VALIDATION para problem details 400", () => {
		const problem = mapErrorToProblem({
			code: "VALIDATION",
			error: {
				message: "Invalid query",
				all: [{ path: ["query", "limit"], message: "must be <= 200" }],
			},
			pathname: "/catalog/vod",
			isProduction: false,
			traceId,
		});

		expect(problem).toEqual({
			type: "https://cinefy.dev/problems/validation-error",
			title: "Validation Error",
			status: 400,
			detail: "Invalid query",
			instance: "/catalog/vod",
			traceId,
			errors: [{ path: "query.limit", message: "must be <= 200" }],
		});
	});

	it("mapeia NOT_FOUND para problem details 404", () => {
		const problem = mapErrorToProblem({
			code: "NOT_FOUND",
			error: new Error("nope"),
			pathname: "/missing",
			isProduction: false,
			traceId,
		});

		expect(problem).toEqual({
			type: "https://cinefy.dev/problems/not-found",
			title: "Resource Not Found",
			status: 404,
			detail: "The requested resource was not found",
			instance: "/missing",
			traceId,
		});
	});

	it("mapeia PARSE para problem details 400", () => {
		const problem = mapErrorToProblem({
			code: "PARSE",
			error: new Error("bad body"),
			pathname: "/catalog/vod/sync",
			isProduction: false,
			traceId,
		});

		expect(problem).toEqual({
			type: "https://cinefy.dev/problems/parse-error",
			title: "Invalid Request",
			status: 400,
			detail: "The request body is malformed or invalid",
			instance: "/catalog/vod/sync",
			traceId,
		});
	});

	it("retorna detalhe generico em producao para erro interno", () => {
		const problem = mapErrorToProblem({
			code: "INTERNAL_SERVER_ERROR",
			error: new Error("secret stack detail"),
			pathname: "/catalog/vod/sync",
			isProduction: true,
			traceId,
		});

		expect(problem).toEqual({
			type: "https://cinefy.dev/problems/internal-server-error",
			title: "Internal Server Error",
			status: 500,
			detail: "An unexpected error occurred",
			instance: "/catalog/vod/sync",
			traceId,
		});
	});

	it("retorna mensagem real fora de producao para erro interno", () => {
		const problem = mapErrorToProblem({
			code: "INTERNAL_SERVER_ERROR",
			error: new Error("sync exploded"),
			pathname: "/catalog/vod/sync",
			isProduction: false,
			traceId,
		});

		expect(problem).toEqual({
			type: "https://cinefy.dev/problems/internal-server-error",
			title: "Internal Server Error",
			status: 500,
			detail: "sync exploded",
			instance: "/catalog/vod/sync",
			traceId,
		});
	});
});
