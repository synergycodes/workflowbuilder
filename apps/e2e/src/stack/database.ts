import { randomBytes } from 'node:crypto';
import postgres from 'postgres';

type RunDatabase = { url: string; drop: () => Promise<void> };

function connect(url: string) {
  return postgres(url, { max: 1, connect_timeout: 5, onnotice: () => {} });
}

export async function createDatabase(serverUrl: string): Promise<RunDatabase> {
  const name = `wb_e2e_${Date.now()}_${randomBytes(3).toString('hex')}`;
  const sql = connect(serverUrl);
  try {
    await sql`CREATE DATABASE ${sql(name)}`;
  } catch (error) {
    const { host } = new URL(serverUrl);
    throw new Error(
      `Cannot create the e2e database on the Postgres server at ${host}. Start it with \`pnpm e2e:db:up\`, or point E2E_POSTGRES_URL at a server you can create databases on.`,
      { cause: error },
    );
  } finally {
    await sql.end();
  }

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;

  return {
    url: url.toString(),
    async drop() {
      const admin = connect(serverUrl);
      try {
        await admin`DROP DATABASE IF EXISTS ${admin(name)} WITH (FORCE)`;
      } finally {
        await admin.end();
      }
    },
  };
}
