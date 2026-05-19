import { describe, expect, it } from 'vitest';

import { type EventFetcher, drainEventsSince } from './drain-events';
import type { ExecutionEventRow } from './fetch-events-after';

function makeEvent(executionId: string, sequence: number, type = 'node_completed'): ExecutionEventRow {
  const stamp = new Date(`2026-05-19T00:00:${sequence.toString().padStart(2, '0')}Z`);
  return {
    id: `e-${executionId}-${sequence}`,
    executionId,
    sequence,
    timestamp: stamp,
    type,
    nodeId: null,
    pathId: null,
    payloadJson: null,
    createdAt: stamp,
  };
}

// Helper: a fetcher that always returns the same set of rows regardless of
// `executionId` / `afterSequence`. Useful for tests that pin a behaviour on
// a fixed sequence and don't care about the incremental-query semantics.
function fixedFetcher(rows: ExecutionEventRow[]): EventFetcher {
  return async () => rows;
}

describe('drainEventsSince', () => {
  it('writes every fetched event and reports the new cursor', async () => {
    const rows = [makeEvent('exec-1', 6), makeEvent('exec-1', 7)];
    const written: number[] = [];

    const result = await drainEventsSince(
      'exec-1',
      5,
      async () => rows,
      async (event) => {
        written.push(event.sequence);
      },
    );

    expect(written).toEqual([6, 7]);
    expect(result).toEqual({ lastSequence: 7, reachedTerminal: false, writeFailed: false });
  });

  it('burst of N notifies pulls exactly 1 row each, never the full history', async () => {
    const rowsInDatabase: ExecutionEventRow[] = [];
    let queries = 0;
    let rowsReturned = 0;

    const fetch: EventFetcher = async (executionId, afterSequence) => {
      queries += 1;
      const subset = rowsInDatabase.filter((r) => r.executionId === executionId && r.sequence > afterSequence);
      rowsReturned += subset.length;
      return subset;
    };

    const N = 10;
    let cursor = 0;
    for (let seq = 1; seq <= N; seq++) {
      rowsInDatabase.push(makeEvent('exec-1', seq));
      const result = await drainEventsSince('exec-1', cursor, fetch, async () => {});
      expect(result.lastSequence).toBe(seq);
      cursor = result.lastSequence;
    }

    expect(queries).toBe(N);
    expect(rowsReturned).toBe(N);
  });

  it('flags terminal when the last fetched event is execution_completed', async () => {
    const fetch = fixedFetcher([makeEvent('exec-1', 1), makeEvent('exec-1', 2, 'execution_completed')]);

    const result = await drainEventsSince('exec-1', 0, fetch, async () => {});

    expect(result.reachedTerminal).toBe(true);
    expect(result.lastSequence).toBe(2);
  });

  it('write failure stops the drain and pins the cursor at the last successful write', async () => {
    const fetch = fixedFetcher([makeEvent('exec-1', 1), makeEvent('exec-1', 2), makeEvent('exec-1', 3)]);
    let calls = 0;
    const write = async () => {
      calls += 1;
      if (calls === 2) throw new Error('stream closed');
    };

    const result = await drainEventsSince('exec-1', 0, fetch, write);

    expect(result).toEqual({ lastSequence: 1, reachedTerminal: false, writeFailed: true });
    expect(calls).toBe(2);
  });

  it('empty fetch result is benign (late-firing NOTIFY does nothing)', async () => {
    const result = await drainEventsSince(
      'exec-1',
      99,
      async () => [],
      async () => {},
    );

    expect(result).toEqual({ lastSequence: 99, reachedTerminal: false, writeFailed: false });
  });

  it('two concurrent notifies coalesce — each row is written exactly once', async () => {
    // Mirrors the serialize-coalesce harness used inline in
    // apps/backend/src/routes/executions.ts. Without it, both notifies
    // would observe the same stale cursor and write every row twice.
    const rowsInDatabase: ExecutionEventRow[] = [makeEvent('exec-1', 1), makeEvent('exec-1', 2)];
    const written: number[] = [];

    const fetch: EventFetcher = async (executionId, afterSequence) => {
      // Yield once so a second concurrent caller can race the cursor read.
      await Promise.resolve();
      return rowsInDatabase.filter((r) => r.executionId === executionId && r.sequence > afterSequence);
    };
    const write = async (event: ExecutionEventRow) => {
      written.push(event.sequence);
    };

    let draining = false;
    let pendingNotify = false;
    let lastSequence = 0;
    let done = false;

    const notify = async () => {
      if (done) return;
      if (draining) {
        pendingNotify = true;
        return;
      }
      draining = true;
      try {
        do {
          pendingNotify = false;
          const result = await drainEventsSince('exec-1', lastSequence, fetch, write);
          lastSequence = result.lastSequence;
          if (result.reachedTerminal || result.writeFailed) {
            done = true;
            return;
          }
        } while (pendingNotify && !done);
      } finally {
        draining = false;
      }
    };

    await Promise.all([notify(), notify()]);

    expect(written).toEqual([1, 2]);
    expect(lastSequence).toBe(2);
  });

  it('scopes to its executionId — subscriber A does not see subscriber B events', async () => {
    const rowsInDatabase: ExecutionEventRow[] = [
      makeEvent('exec-A', 1),
      makeEvent('exec-A', 2),
      makeEvent('exec-B', 1),
    ];
    const fetch: EventFetcher = async (executionId, afterSequence) =>
      rowsInDatabase.filter((r) => r.executionId === executionId && r.sequence > afterSequence);

    const writtenA: number[] = [];
    const writtenB: number[] = [];
    await drainEventsSince('exec-A', 0, fetch, async (event) => {
      writtenA.push(event.sequence);
    });
    await drainEventsSince('exec-B', 0, fetch, async (event) => {
      writtenB.push(event.sequence);
    });

    expect(writtenA).toEqual([1, 2]);
    expect(writtenB).toEqual([1]);
  });
});
