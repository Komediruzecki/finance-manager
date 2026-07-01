import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import { fileURLToPath } from 'node:url';

// Runs the real Worker (src/index.ts) in workerd via Miniflare, against a local D1 built from
// worker/migrations/. `readD1Migrations` parses the .sql files; they're handed to the test
// runtime as the TEST_MIGRATIONS binding and applied once in test/apply-migrations.ts.
export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(
    fileURLToPath(new URL('./migrations', import.meta.url))
  );
  return {
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
      poolOptions: {
        workers: {
          singleWorker: true,
          isolatedStorage: false,
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: {
            // JWT_SECRET is normally a wrangler secret (.dev.vars); supply a throwaway one for tests
            // so requireAuth + issueSessionCookie work end-to-end.
            bindings: {
              JWT_SECRET: 'test-jwt-secret-not-for-prod',
              TEST_MIGRATIONS: migrations,
            },
          },
        },
      },
    },
  };
});
