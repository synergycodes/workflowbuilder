import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

import { env } from '../env';

// Programmatic equivalent of `pnpm db:migrate`, reading the same SQL files
// from apps/backend/drizzle/. Runs at backend boot so deployments need no
// separate migration step or image — and drizzle-kit can stay a
// devDependency. Single-replica assumption (WB-229): concurrent backends
// would race the migrator.
export async function runMigrations(): Promise<void> {
  const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
  // Dedicated throwaway connection — the app pool in client.ts outlives this,
  // but the migrator's connection must not linger once it finishes.
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
  } finally {
    await sql.end();
  }
}
