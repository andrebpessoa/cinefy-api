import { DrizzleQueryError } from "drizzle-orm";

type ProblemDetails = {
	type: string;
	title: string;
	status: number;
	detail?: string;
	instance?: string;
	errors?: Array<{
		path?: string;
		message: string;
	}>;
};

type ValidationLikeError = {
	message?: string;
	all?: Array<{ path?: string | Array<string | number>; message?: string }>;
};

function isObjectWithMessage(error: unknown): error is {
	message?: unknown;
} {
	return typeof error === "object" && error !== null;
}

function isValidationLikeError(error: unknown): error is ValidationLikeError {
	return (
		typeof error === "object" &&
		error !== null &&
		("all" in error || "message" in error)
	);
}

function normalizePath(path: string | Array<string | number> | undefined) {
	if (Array.isArray(path)) {
		return path.join(".");
	}

	return path;
}

function getErrorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	const maybeMessage = isObjectWithMessage(error) ? error.message : undefined;
	return typeof maybeMessage === "string" && maybeMessage.length > 0
		? maybeMessage
		: fallback;
}

export function extractValidationErrors(error: unknown) {
	if (!isValidationLikeError(error)) {
		return [];
	}

	const issues = Array.isArray(error.all) ? error.all : [];

	return issues.map((issue) => ({
		path: normalizePath(issue.path),
		message: issue.message ?? "Validation error",
	}));
}

export function errorSummaryForLog(error: unknown): {
	name: string;
	message: string;
	queryPreview?: string;
	bindCount?: number;
} {
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
	if (error instanceof Error) {
		return { name: error.name, message: error.message };
	}
	return { name: "UnknownError", message: String(error) };
}

export function mapErrorToProblem(options: {
	code: string | number;
	error: unknown;
	pathname: string;
	isProduction: boolean;
}) {
	const { error, pathname, isProduction } = options;
	const code = String(options.code);

	if (code === "VALIDATION") {
		const issues = extractValidationErrors(error);
		return {
			type: "https://cinefy.dev/problems/validation-error",
			title: "Validation Error",
			status: 400,
			detail: getErrorMessage(error, "Invalid request payload"),
			instance: pathname,
			errors: issues.length > 0 ? issues : undefined,
		} satisfies ProblemDetails;
	}

	if (code === "NOT_FOUND") {
		return {
			type: "https://cinefy.dev/problems/not-found",
			title: "Resource Not Found",
			status: 404,
			detail: "The requested resource was not found",
			instance: pathname,
		} satisfies ProblemDetails;
	}

	if (code === "PARSE") {
		return {
			type: "https://cinefy.dev/problems/parse-error",
			title: "Invalid Request",
			status: 400,
			detail: "The request body is malformed or invalid",
			instance: pathname,
		} satisfies ProblemDetails;
	}

	return {
		type: "https://cinefy.dev/problems/internal-server-error",
		title: "Internal Server Error",
		status: 500,
		detail: isProduction
			? "An unexpected error occurred"
			: getErrorMessage(error, "Unknown internal error"),
		instance: pathname,
	} satisfies ProblemDetails;
}

export const PROBLEM_JSON_HEADERS = {
	"content-type": "application/problem+json",
} as const;
