export type ProblemDetails = {
	type: string;
	title: string;
	status: number;
	detail?: string;
	instance?: string;
	traceId?: string;
	errors?: Array<{ path?: string; message: string }>;
};

export abstract class AppError extends Error {
	abstract readonly status: number;
	abstract readonly problemType: string;
	abstract readonly title: string;

	constructor(message?: string, options?: ErrorOptions) {
		super(message ?? "", options);
		this.name = new.target.name;
	}

	toProblem(pathname: string, traceId: string): ProblemDetails {
		return {
			type: this.problemType,
			title: this.title,
			status: this.status,
			detail: this.message || undefined,
			instance: pathname,
			traceId,
		};
	}
}
