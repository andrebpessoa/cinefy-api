import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at", { mode: "date" }).notNull(),
	updatedAt: timestamp("updated_at", { mode: "date" })
		.$onUpdate(() => new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at", { mode: "date" }).notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			mode: "date",
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			mode: "date",
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at", { mode: "date" }).notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const vodItems = pgTable(
	"vod_items",
	{
		id: serial("id").primaryKey(),
		externalId: integer("external_id").notNull(),
		name: text("name").notNull(),
		title: text("title").notNull(),
		year: text("year"),
		streamType: text("stream_type").notNull(),
		streamIcon: text("stream_icon").notNull(),
		rating: real("rating").notNull(),
		rating5based: real("rating_5based").notNull(),
		added: text("added").notNull(),
		categoryId: text("category_id").notNull(),
		categoryIds: jsonb("category_ids").$type<number[]>().notNull(),
		containerExtension: text("container_extension"),
		customSid: text("custom_sid").notNull(),
		directSource: text("direct_source").notNull(),
		rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
		sourceUpdatedAt: timestamp("source_updated_at"),
		syncedAt: timestamp("synced_at").defaultNow().notNull(),
		deactivatedAt: timestamp("deactivated_at"),
	},
	(table) => [uniqueIndex("external_id_uq").on(table.externalId)],
);

export const catalogSyncState = pgTable("catalog_sync_state", {
	id: text("id").primaryKey(),
	lastSuccessAt: timestamp("last_success_at"),
	lastAttemptAt: timestamp("last_attempt_at").notNull(),
	lastError: text("last_error"),
	lastItemCount: integer("last_item_count"),
});

export const seriesItems = pgTable(
	"series_items",
	{
		id: serial("id").primaryKey(),
		externalId: integer("external_id").notNull(),
		name: text("name").notNull(),
		title: text("title").notNull(),
		year: text("year"),
		streamType: text("stream_type").notNull(),
		cover: text("cover").notNull(),
		plot: text("plot"),
		cast: text("cast"),
		director: text("director"),
		genre: text("genre"),
		releaseDate: text("release_date"),
		rating: text("rating").notNull(),
		rating5based: real("rating_5based").notNull(),
		categoryId: text("category_id").notNull(),
		categoryIds: jsonb("category_ids").$type<number[]>().notNull(),
		backdropPath: jsonb("backdrop_path").$type<string[]>().notNull(),
		youtubeTrailer: text("youtube_trailer"),
		episodeRunTime: text("episode_run_time").notNull(),
		lastModified: text("last_modified").notNull(),
		rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
		sourceUpdatedAt: timestamp("source_updated_at"),
		syncedAt: timestamp("synced_at").defaultNow().notNull(),
		deactivatedAt: timestamp("deactivated_at"),
	},
	(table) => [uniqueIndex("series_external_id_uq").on(table.externalId)],
);

export const liveStreamItems = pgTable(
	"live_stream_items",
	{
		id: serial("id").primaryKey(),
		externalId: integer("external_id").notNull(),
		name: text("name").notNull(),
		streamType: text("stream_type").notNull(),
		streamIcon: text("stream_icon").notNull(),
		added: text("added").notNull(),
		customSid: text("custom_sid").notNull(),
		tvArchive: integer("tv_archive").notNull(),
		tvArchiveDuration: integer("tv_archive_duration").notNull(),
		directSource: text("direct_source").notNull(),
		categoryId: text("category_id").notNull(),
		categoryIds: jsonb("category_ids").$type<number[]>().notNull(),
		thumbnail: text("thumbnail").notNull(),
		epgChannelId: text("epg_channel_id"),
		rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
		syncedAt: timestamp("synced_at").defaultNow().notNull(),
		deactivatedAt: timestamp("deactivated_at"),
	},
	(table) => [uniqueIndex("live_stream_external_id_uq").on(table.externalId)],
);

export const catalogSyncJobs = pgTable(
	"catalog_sync_jobs",
	{
		id: text("id").primaryKey(),
		kind: text("kind").notNull(),
		status: text("status").notNull(),
		error: text("error"),
		startedAt: timestamp("started_at", { mode: "date" }).notNull(),
		finishedAt: timestamp("finished_at", { mode: "date" }),
	},
	(table) => [index("catalog_sync_jobs_kind_idx").on(table.kind)],
);
