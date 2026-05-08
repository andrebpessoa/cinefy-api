import { env } from "./config/env";
import { createDatabase } from "./db/client";
import { createAuth } from "./lib/auth";
import { createOpenapiPlugin } from "./lib/openapi";
import { createRateLimitStore } from "./lib/rate-limit-store";
import { createRedis } from "./lib/redis";
import { createCatalogService } from "./modules/catalog/service";
import { createSyncJobsRepo } from "./modules/catalog/sync-jobs.repo";

export async function createContainer() {
	const { db, pool } = createDatabase(env);
	const redis = createRedis(env);
	const rateLimitStore = createRateLimitStore(redis);
	const auth = createAuth({ db, env, redis });
	const catalogService = createCatalogService({ db, env });
	const syncJobs = createSyncJobsRepo(db);
	const openapiPlugin = await createOpenapiPlugin(auth);

	return {
		env,
		db,
		pool,
		redis,
		rateLimitStore,
		auth,
		catalogService,
		syncJobs,
		openapiPlugin,
	};
}

export type Container = Awaited<ReturnType<typeof createContainer>>;
