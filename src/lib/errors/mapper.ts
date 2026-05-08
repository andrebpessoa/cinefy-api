import { DrizzleQueryError } from "drizzle-orm";
import { ZodError } from "zod";
import type { ProblemDetails } from "./app-error";
import { AppError } from "./app-error";
import { ValidationAppError } from "./domain";
import { PROBLEM_TYPES } from "./types";

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

function getErrorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	const maybeMessage = isObjectWithMessage(error) ? error.message : undefined;
	return typeof maybeMessage === "string" && maybeMessage.length > 0
		? maybeMessage
		: fallback;
}

export function mapErrorToProblem(options: {
	code: string | number;
	error: unknown;
	pathname: string;
	isProduction: boolean;
	traceId: string;
}): ProblemDetails {
	const { error, pathname, isProduction, traceId } = options;
	const code = String(options.code);

	if (error instanceof AppError) {
		return error.toProblem(pathname, traceId);
	}

	if (error instanceof ZodError) {
		return ValidationAppError.fromZod(error).toProblem(pathname, traceId);
	}

	if (code === "VALIDATION") {
		const issues = extractValidationErrors(error);
		return {
			type: PROBLEM_TYPES.VALIDATION_ERROR,
			title: "Validation Error",
			status: 400,
			detail: getErrorMessage(error, "Invalid request payload"),
			instance: pathname,
			traceId,
			errors: issues.length > 0 ? issues : undefined,
		};
	}

	if (code === "NOT_FOUND") {
		return {
			type: PROBLEM_TYPES.NOT_FOUND,
			title: "Resource Not Found",
			status: 404,
			detail: "The requested resource was not found",
			instance: pathname,
			traceId,
		};
	}

	if (code === "PARSE") {
		return {
			type: PROBLEM_TYPES.PARSE_ERROR,
			title: "Invalid Request",
			status: 400,
			detail: "The request body is malformed or invalid",
			instance: pathname,
			traceId,
		};
	}

	if (error instanceof DrizzleQueryError) {
		const cause =
			error.cause instanceof Error ? error.cause.message : String(error.cause);
		return {
			type: PROBLEM_TYPES.INTERNAL,
			title: "Internal Server Error",
			status: 500,
			detail: isProduction ? "An unexpected error occurred" : cause,
			instance: pathname,
			traceId,
		};
	}

	return {
		type: PROBLEM_TYPES.INTERNAL,
		title: "Internal Server Error",
		status: 500,
		detail: isProduction
			? "An unexpected error occurred"
			: getErrorMessage(error, "Unknown internal error"),
		instance: pathname,
		traceId,
	};
}

export const PROBLEM_JSON_HEADERS = {
	"content-type": "application/problem+json",
	"cache-control": "no-store",
} as const;
