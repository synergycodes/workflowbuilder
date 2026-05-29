import type { DrainResult } from './drain-events';

type DrainStep = (cursor: number) => Promise<DrainResult>;

type SerializedDrainer = {
  notify: () => Promise<void>;
  stop: () => void;
  readonly done: boolean;
  readonly cursor: number;
};

// Serializes drain passes for a single subscriber. The Postgres NOTIFY
// dispatcher invokes subscribers without awaiting them, so two notifies in
// quick succession would otherwise start parallel drains that both read the
// stale cursor and write each row twice. A burst is coalesced into a single
// follow-up pass after the in-flight drain settles.
export function createSerializedDrainer(initialCursor: number, drain: DrainStep): SerializedDrainer {
  let cursor = initialCursor;
  let draining = false;
  let pendingNotify = false;
  let done = false;

  async function notify(): Promise<void> {
    if (done) return;
    if (draining) {
      pendingNotify = true;
      return;
    }
    draining = true;
    try {
      do {
        pendingNotify = false;
        const result = await drain(cursor);
        cursor = result.lastSequence;
        if (result.reachedTerminal || result.writeFailed) {
          done = true;
          return;
        }
      } while (pendingNotify && !done);
    } finally {
      draining = false;
    }
  }

  return {
    notify,
    stop() {
      done = true;
    },
    get done() {
      return done;
    },
    get cursor() {
      return cursor;
    },
  };
}
