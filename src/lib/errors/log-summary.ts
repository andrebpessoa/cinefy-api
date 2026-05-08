import { DrizzleQueryError } from "drizzle-orm";
import { ZodError } from "zod";

function isDomAbort(error: unknown): error is DOMException {
	return error instanceof DOMException && error.name === "AbortError";
}

export function errorSummaryForLog(error: unknown): {
	name: string;
	message: string;
	queryPreview?: string;
	bindCount?: number;
	zodIssues?: number;
} {
	if (error instanceof ZodError) {
		return {
			name: error.name,
			message: error.issues
				.map((i) => `${i.path.join(".")}: ${i.message}`)
				.join("; "),
			zodIssues: error.issues.length,
		};
	}
	if (error instanceof DrizzleQueryError) {
		const cause =
			error.cause instanceof Error ? error.cause.message : String(error.cause);
		return {
			name: error.name,
			message: cause,
			queryPreview: error.query.slice(0, 200),
			bindCount: error.params?.length,
		};
	}
	if (isDomAbort(error)) {
		return { name: "AbortError", message: error.message || "Aborted" };
	}
	if (error instanceof Error) {
		return { name: error.name, message: error.message };
	}
	return { name: "UnknownError", message: String(error) };
}
