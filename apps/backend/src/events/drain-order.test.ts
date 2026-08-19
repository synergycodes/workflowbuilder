import { describe, expect, it } from 'vitest';

import { drainEventsSince } from './drain-events';
import type { ExecutionEventRow } from './fetch-events-after';
import { createSerializedDrainer } from './serialized-drainer';

// The cursor contract, from the reading side.
//
// The drain advances a monotonic cursor and queries `sequence > cursor`, so it can
// only deliver events that become visible in Postgres in ascending `sequence` order.
// These tests state that requirement as executable documentation: the middle one
// asserts the loss, not because losing events is desirable, but so that anyone who
// makes the writer emit concurrently again can see what it costs. The writer upholds
// the ordering in `sequenced-event-emitter.ts`.
//
// Rows are made visible one at a time via `visible`, modelling per-row commit moments;
// the fetcher sees only visible rows, exactly as the real query would.

const EXECUTION = 'exec-1';

function row(sequence: number, type: string, nodeId?: string): ExecutionEventRow {
  const stamp = new Date(`2026-05-19T00:00:${String(sequence).padStart(2, '0')}Z`);
  return {
    id: `e-${sequence}`,
    executionId: EXECUTION,
    sequence,
    timestamp: stamp,
    type,
    nodeId: nodeId ?? null,
    pathId: null,
    payloadJson: null,
    tenantId: null,
    createdAt: stamp,
  };
}

function makeTable() {
  const visible: ExecutionEventRow[] = [];
  const delivered: number[] = [];

  const fetch = (executionId: string, afterSequence: number) =>
    Promise.resolve(
      visible
        .filter((r) => r.executionId === executionId && r.sequence > afterSequence)
        .sort((a, b) => a.sequence - b.sequence),
    );

  const write = async (event: ExecutionEventRow) => {
    delivered.push(event.sequence);
  };

  // Commit a row and wake the drainer, as the worker's INSERT + pg_notify pair does.
  return { visible, delivered, fetch, write };
}

function drainerOver(table: ReturnType<typeof makeTable>, initialCursor: number) {
  return createSerializedDrainer(initialCursor, (cursor) =>
    drainEventsSince(EXECUTION, cursor, table.fetch, table.write),
  );
}

describe('drain cursor — commit-order contract', () => {
  it('delivers every event when rows commit in ascending sequence order', async () => {
    const table = makeTable();
    const drainer = drainerOver(table, 0);

    for (const sequence of [1, 2, 3, 4]) {
      table.visible.push(row(sequence, 'node_started', `n-${sequence}`));
      await drainer.notify();
    }

    expect(table.delivered).toEqual([1, 2, 3, 4]);
  });

  it('drops a row that commits after the cursor has passed it', async () => {
    // Why the writer must serialize: node C's insert lands before node B's, the
    // cursor moves to 3, and B's event can never be selected again.
    const table = makeTable();
    const drainer = drainerOver(table, 1);

    table.visible.push(row(3, 'node_completed', 'C'));
    await drainer.notify();

    table.visible.push(row(2, 'node_completed', 'B'));
    await drainer.notify();

    expect(table.delivered).toEqual([3]);
    expect(table.delivered).not.toContain(2);
    expect(drainer.cursor).toBe(3);
  });

  it('steps over a permanent gap without stalling', async () => {
    // Gaps are the tolerable failure: a sequence number consumed by an emit that never
    // commits (cancelled run, exhausted retries) costs nothing, because the cursor only
    // ever needs rows to arrive in ascending order — not to be contiguous.
    const table = makeTable();
    const drainer = drainerOver(table, 0);

    table.visible.push(row(1, 'node_started', 'B'));
    await drainer.notify();
    // 2 is never written.
    table.visible.push(row(3, 'node_completed', 'B'));
    await drainer.notify();
    table.visible.push(row(4, 'execution_completed'));
    await drainer.notify();

    expect(table.delivered).toEqual([1, 3, 4]);
    expect(drainer.done).toBe(true);
  });
});
