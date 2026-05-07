export type JobStatus = "pending" | "running" | "succeeded" | "failed";

export type SyncJobRecord = {
	status: JobStatus;
	error?: string;
	startedAt: string;
	finishedAt?: string;
};

const jobs = new Map<string, SyncJobRecord>();

export function createJob(): string {
	const id = crypto.randomUUID();
	jobs.set(id, {
		status: "pending",
		startedAt: new Date().toISOString(),
	});
	return id;
}

export function markJobRunning(id: string) {
	const j = jobs.get(id);
	if (!j) return;
	j.status = "running";
}

export function markJobSucceeded(id: string) {
	const j = jobs.get(id);
	if (!j) return;
	j.status = "succeeded";
	j.finishedAt = new Date().toISOString();
}

export function markJobFailed(id: string, message: string) {
	const j = jobs.get(id);
	if (!j) return;
	j.status = "failed";
	j.error = message;
	j.finishedAt = new Date().toISOString();
}

export function getJob(id: string): SyncJobRecord | undefined {
	return jobs.get(id);
}
