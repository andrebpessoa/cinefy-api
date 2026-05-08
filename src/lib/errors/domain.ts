import { AppError } from "./app-error";
import { PROBLEM_TYPES } from "./types";

export class ValidationAppError extends AppError {
	readonly status = 400;
	readonly problemType = PROBLEM_TYPES.VALIDATION_ERROR;
	readonly title = "Validation Error";
	readonly issues: Array<{ path?: string; message: string }>;

	constructor(
		message: string,
		issues: Array<{ path?: string; message: string }> = [],
	) {
		super(message);
		this.issues = issues;
	}

	static fromZod(error: import("zod").ZodError): ValidationAppError {
		const issues = error.issues.map((i) => ({
			path: i.path.length ? i.path.join(".") : undefined,
			message: i.message,
		}));
		return new ValidationAppError(error.message || "Invalid request", issues);
	}

	override toProblem(pathname: string, traceId: string) {
		const base = super.toProblem(pathname, traceId);
		return {
			...base,
			errors: this.issues.length > 0 ? this.issues : undefined,
		};
	}
}

export class NotFoundAppError extends AppError {
	readonly status = 404;
	readonly problemType = PROBLEM_TYPES.NOT_FOUND;
	readonly title = "Resource Not Found";

	constructor(resource: string, id?: string) {
		super(
			id
				? `${resource} not found: ${id}`
				: "The requested resource was not found",
		);
	}
}

export class UnauthorizedAppError extends AppError {
	readonly status = 401;
	readonly problemType = PROBLEM_TYPES.UNAUTHORIZED;
	readonly title = "Unauthorized";

	constructor(message = "Invalid or missing credentials") {
		super(message);
	}
}

export class ServiceUnavailableAppError extends AppError {
	readonly status = 503;
	readonly problemType = PROBLEM_TYPES.SERVICE_UNAVAILABLE;
	readonly title = "Service Unavailable";
}

export class ConflictAppError extends AppError {
	readonly status = 409;
	readonly problemType = PROBLEM_TYPES.CONFLICT;
	readonly title = "Conflict";
}

export class CatalogPayloadEmptyAppError extends AppError {
	readonly status = 502;
	readonly problemType = PROBLEM_TYPES.SERVICE_UNAVAILABLE;
	readonly title = "Bad Gateway";

	constructor(kind: string) {
		super(`Provider returned empty ${kind} list`);
	}
}

export class SyncRetentionGuardAppError extends AppError {
	readonly status = 409;
	readonly problemType = PROBLEM_TYPES.CONFLICT;
	readonly title = "Sync Aborted";
}

export class TooManyRequestsAppError extends AppError {
	readonly status = 429;
	readonly problemType = PROBLEM_TYPES.RATE_LIMITED;
	readonly title = "Too Many Requests";

	constructor(message = "Rate limit exceeded") {
		super(message);
	}
}
