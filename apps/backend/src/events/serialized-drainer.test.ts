import { describe, expect, it } from 'vitest';

import { type EventFetcher, drainEventsSince } from './drain-events';
import type { ExecutionEventRow } from './fetch-events-after';
import { createSerializedDrainer } from './serialized-drainer';

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
    tenantId: null,
    createdAt: stamp,
  };
}

describe('createSerializedDrainer', () => {
  it('coalesces two concurrent notifies — each row is written exactly once', async () => {
    const rowsInDatabase = [makeEvent('exec-1', 1), makeEvent('exec-1', 2)];
    const written: number[] = [];

    const fetch: EventFetcher = async (executionId, afterSequence) => {
      // Yield once so the second concurrent notify can race the cursor read.
      await Promise.resolve();
      return rowsInDatabase.filter((r) => r.executionId === executionId && r.sequence > afterSequence);
    };
    const write = async (event: ExecutionEventRow) => {
      written.push(event.sequence);
    };

    const drainer = createSerializedDrainer(0, (cursor) => drainEventsSince('exec-1', cursor, fetch, write));

    await Promise.all([drainer.notify(), drainer.notify()]);

    expect(written).toEqual([1, 2]);
    expect(drainer.cursor).toBe(2);
  });

  it('a notify arriving mid-drain triggers exactly one follow-up pass', async () => {
    const rowsInDatabase: ExecutionEventRow[] = [makeEvent('exec-1', 1)];
    const written: number[] = [];

    let release: (() => void) | undefined;
    const firstFetchGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let fetchCalls = 0;

    const fetch: EventFetcher = async (executionId, afterSequence) => {
      fetchCalls += 1;
      if (fetchCalls === 1) await firstFetchGate;
      return rowsInDatabase.filter((r) => r.executionId === executionId && r.sequence > afterSequence);
    };
    const write = async (event: ExecutionEventRow) => {
      written.push(event.sequence);
    };

    const drainer = createSerializedDrainer(0, (cursor) => drainEventsSince('exec-1', cursor, fetch, write));

    const first = drainer.notify();
    // Second notify lands while the first drain is parked on the gate.
    const second = drainer.notify();
    rowsInDatabase.push(makeEvent('exec-1', 2));
    release!();
    await Promise.all([first, second]);

    expect(written).toEqual([1, 2]);
    expect(fetchCalls).toBe(2);
    expect(drainer.cursor).toBe(2);
  });

  it('each notify drains only rows after the current cursor', async () => {
    const rowsInDatabase: ExecutionEventRow[] = [];
    let queries = 0;
    const fetch: EventFetcher = async (executionId, afterSequence) => {
      queries += 1;
      return rowsInDatabase.filter((r) => r.executionId === executionId && r.sequence > afterSequence);
    };

    const drainer = createSerializedDrainer(0, (cursor) => drainEventsSince('exec-1', cursor, fetch, async () => {}));

    rowsInDatabase.push(makeEvent('exec-1', 1));
    await drainer.notify();
    expect(drainer.cursor).toBe(1);

    rowsInDatabase.push(makeEvent('exec-1', 2));
    await drainer.notify();
    expect(drainer.cursor).toBe(2);
    expect(queries).toBe(2);
  });

  it('replays from the initial cursor — covers events missed before the first notify', async () => {
    // Mirrors the catch-up drain in the SSE route: an event lands after the
    // snapshot cursor (5) but before the first notify; it must still be read.
    const rowsInDatabase = [makeEvent('exec-1', 6)];
    const written: number[] = [];
    const fetch: EventFetcher = async (executionId, afterSequence) =>
      rowsInDatabase.filter((r) => r.executionId === executionId && r.sequence > afterSequence);

    const drainer = createSerializedDrainer(5, (cursor) =>
      drainEventsSince('exec-1', cursor, fetch, async (event) => {
        written.push(event.sequence);
      }),
    );

    await drainer.notify();

    expect(written).toEqual([6]);
    expect(drainer.cursor).toBe(6);
  });

  it('marks done and ignores later notifies once a drain reaches a terminal event', async () => {
    let calls = 0;
    const drainer = createSerializedDrainer(0, async () => {
      calls += 1;
      return { lastSequence: calls, reachedTerminal: true, writeFailed: false };
    });

    await drainer.notify();
    await drainer.notify();

    expect(drainer.done).toBe(true);
    expect(calls).toBe(1);
  });

  it('marks done when a drain reports a failed write', async () => {
    const drainer = createSerializedDrainer(0, async () => ({
      lastSequence: 0,
      reachedTerminal: false,
      writeFailed: true,
    }));

    await drainer.notify();

    expect(drainer.done).toBe(true);
  });

  it('stop() prevents any further drain', async () => {
    let calls = 0;
    const drainer = createSerializedDrainer(0, async () => {
      calls += 1;
      return { lastSequence: 0, reachedTerminal: false, writeFailed: false };
    });

    drainer.stop();
    await drainer.notify();

    expect(calls).toBe(0);
    expect(drainer.done).toBe(true);
  });
});
