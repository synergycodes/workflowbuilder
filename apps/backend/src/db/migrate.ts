import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

import { env } from '../env';

// Same SQL files as `pnpm db:migrate`. Concurrent backends would race the
// migrator — single replica assumed.
export async function runMigrations(): Promise<void> {
  const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
  } finally {
    await sql.end();
  }
}
