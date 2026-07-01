import { applyD1Migrations, env } from 'cloudflare:test';

// Build the D1 schema once before the suite (singleWorker + isolatedStorage:false share one DB).
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
