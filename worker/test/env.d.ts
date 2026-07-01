import type { Env } from '../src/index';

// Bindings injected by vitest.config.ts (miniflare.bindings) on top of wrangler.jsonc.
declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {
    JWT_SECRET: string;
    TEST_MIGRATIONS: D1Migration[];
  }
}
