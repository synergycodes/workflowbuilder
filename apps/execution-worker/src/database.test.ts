import { describe, expect, it, vi } from 'vitest';

import {
  type ExecutionStatus,
  TERMINAL_EXECUTION_STATUSES,
} from '@workflow-builder/types/workflow-execution/execution-events';

import { database } from './database';

// Records each query the tag sends; the `sql([...])` list helper returns a marker, so the test reads the
// list the `NOT IN` guard received rather than the helper that builds it.
const { queries, fakeSql } = vi.hoisted(() => {
  const queries: { strings: readonly string[]; values: unknown[] }[] = [];
  function fakeSql(first: readonly string[], ...values: unknown[]) {
    if (!('raw' in first)) return { list: first };
    queries.push({ strings: first, values });
    return Promise.resolve([]);
  }
  return { queries, fakeSql };
});

vi.mock('postgres', () => ({ default: () => fakeSql }));

async function statusesKeptAgainst(status: ExecutionStatus): Promise<unknown> {
  queries.length = 0;
  await database.updateExecutionStatus('execution-1', status);
  const query = queries[0];
  if (query === undefined) throw new Error('updateExecutionStatus sent no query');
  const guard = query.strings.findIndex((part) => part.trimEnd().endsWith('status NOT IN'));
  return (query.values[guard] as { list: unknown }).list;
}

describe('updateExecutionStatus', () => {
  it.each<ExecutionStatus>(['waiting', 'running', 'pending', 'cancelling'])(
    'keeps cancelling and every terminal status out of reach of %s',
    async (status) => {
      expect(await statusesKeptAgainst(status)).toEqual([...TERMINAL_EXECUTION_STATUSES, 'cancelling']);
    },
  );

  it.each<ExecutionStatus>([...TERMINAL_EXECUTION_STATUSES])(
    'lets a terminal %s replace cancelling, never another terminal status',
    async (status) => {
      expect(await statusesKeptAgainst(status)).toEqual([...TERMINAL_EXECUTION_STATUSES]);
    },
  );
});
