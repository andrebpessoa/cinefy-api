CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_sync_jobs" (
	"id" text PRIMARY KEY,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "catalog_sync_state" (
	"id" text PRIMARY KEY,
	"last_success_at" timestamp,
	"last_attempt_at" timestamp NOT NULL,
	"last_error" text,
	"last_item_count" integer
);
--> statement-breakpoint
CREATE TABLE "live_stream_items" (
	"id" serial PRIMARY KEY,
	"external_id" integer NOT NULL,
	"name" text NOT NULL,
	"stream_type" text NOT NULL,
	"stream_icon" text NOT NULL,
	"added" text NOT NULL,
	"custom_sid" text NOT NULL,
	"tv_archive" integer NOT NULL,
	"tv_archive_duration" integer NOT NULL,
	"direct_source" text NOT NULL,
	"category_id" text NOT NULL,
	"category_ids" jsonb NOT NULL,
	"thumbnail" text NOT NULL,
	"epg_channel_id" text,
	"raw_payload" jsonb NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"deactivated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "series_items" (
	"id" serial PRIMARY KEY,
	"external_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"year" text,
	"stream_type" text NOT NULL,
	"cover" text NOT NULL,
	"plot" text,
	"cast" text,
	"director" text,
	"genre" text,
	"release_date" text,
	"rating" text NOT NULL,
	"rating_5based" real NOT NULL,
	"category_id" text NOT NULL,
	"category_ids" jsonb NOT NULL,
	"backdrop_path" jsonb NOT NULL,
	"youtube_trailer" text,
	"episode_run_time" text NOT NULL,
	"last_modified" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"source_updated_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"deactivated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vod_items" (
	"id" serial PRIMARY KEY,
	"external_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"year" text,
	"stream_type" text NOT NULL,
	"stream_icon" text NOT NULL,
	"rating" real NOT NULL,
	"rating_5based" real NOT NULL,
	"added" text NOT NULL,
	"category_id" text NOT NULL,
	"category_ids" jsonb NOT NULL,
	"container_extension" text,
	"custom_sid" text NOT NULL,
	"direct_source" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"source_updated_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"deactivated_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "catalog_sync_jobs_kind_idx" ON "catalog_sync_jobs" ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "live_stream_external_id_uq" ON "live_stream_items" ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "series_external_id_uq" ON "series_items" ("external_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "external_id_uq" ON "vod_items" ("external_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;