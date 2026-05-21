// Global LISTEN/NOTIFY dispatcher — one PG listener, many SSE subscribers
import postgres from 'postgres';

import { env } from '../env';

type Subscriber = (executionId: string) => void;

const subscribers = new Map<string, Set<Subscriber>>();

const listenSql = postgres(env.DATABASE_URL);

let listening = false;

async function ensureListening() {
  if (listening) return;
  listening = true;

  await listenSql.listen('execution_events', (executionId) => {
    const subs = subscribers.get(executionId);
    if (!subs) return;
    for (const callback of subs) {
      callback(executionId);
    }
  });
}

export async function subscribe(executionId: string, callback: Subscriber): Promise<() => void> {
  await ensureListening();

  let subs = subscribers.get(executionId);
  if (!subs) {
    subs = new Set();
    subscribers.set(executionId, subs);
  }
  subs.add(callback);

  return () => {
    subs!.delete(callback);
    if (subs!.size === 0) {
      subscribers.delete(executionId);
    }
  };
}
