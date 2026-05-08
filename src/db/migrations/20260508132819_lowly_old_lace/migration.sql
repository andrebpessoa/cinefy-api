CREATE TABLE "catalog_sync_jobs" (
	"id" text PRIMARY KEY,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "live_stream_items" ADD COLUMN "deactivated_at" timestamp;--> statement-breakpoint
ALTER TABLE "series_items" ADD COLUMN "deactivated_at" timestamp;--> statement-breakpoint
ALTER TABLE "vod_items" ADD COLUMN "deactivated_at" timestamp;--> statement-breakpoint
CREATE INDEX "catalog_sync_jobs_kind_idx" ON "catalog_sync_jobs" ("kind");