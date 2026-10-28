import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LIMIT,
  EXECUTION_STATUSES,
  LIST_ORDER,
  MAX_LIMIT,
  decodeCursor,
  encodeCursor,
  listExecutionsWhere,
  pageOf,
  parseListExecutionsQuery,
} from './list-executions-query';

// Renders a fragment to text and params without a connection, so the SQL is asserted as written.
const dialect = new PgDialect();
const render = (fragment: Parameters<PgDialect['sqlToQuery']>[0]) => dialect.sqlToQuery(fragment);

const ID = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
const ISO = '2026-09-18T10:00:00.123Z';
const token = encodeCursor({ createdAt: new Date(ISO), id: ID });
const base64url = (text: string) => Buffer.from(text).toString('base64url');

describe('parseListExecutionsQuery', () => {
  it('no params - default limit, no filters, no cursor', () => {
    expect(parseListExecutionsQuery({})).toEqual({ ok: true, query: { limit: DEFAULT_LIMIT } });
  });

  it.each([
    { limit: '500', expected: MAX_LIMIT },
    { limit: '200', expected: 200 },
    { limit: '1', expected: 1 },
  ])('limit=$limit -> $expected (clamped above the cap, never refused)', ({ limit, expected }) => {
    expect(parseListExecutionsQuery({ limit })).toEqual({ ok: true, query: { limit: expected } });
  });

  it.each(['0', '-1', 'abc', '1.5'])('limit=%j -> invalid_limit', (limit) => {
    expect(parseListExecutionsQuery({ limit })).toMatchObject({ ok: false, code: 'invalid_limit' });
  });

  it.each([...EXECUTION_STATUSES])('status=%s passes', (status) => {
    expect(parseListExecutionsQuery({ status })).toEqual({ ok: true, query: { limit: DEFAULT_LIMIT, status } });
  });

  it('knows exactly the eight execution statuses', () => {
    expect([...EXECUTION_STATUSES].sort()).toEqual(
      ['cancelled', 'cancelling', 'completed', 'failed', 'incomplete', 'pending', 'running', 'waiting'].sort(),
    );
  });

  it.each(['waitting', 'WAITING', 'constructor'])('status=%j -> invalid_status, never an empty list', (status) => {
    expect(parseListExecutionsQuery({ status })).toMatchObject({ ok: false, code: 'invalid_status' });
  });

  it.each([ID, ID.toUpperCase()])('workflowId=%s passes through', (workflowId) => {
    expect(parseListExecutionsQuery({ workflowId })).toEqual({ ok: true, query: { limit: DEFAULT_LIMIT, workflowId } });
  });

  it.each(['nope', '0b6e7d9c-4b1a-4c2e-9a3f'])(
    'workflowId=%j -> invalid_workflow_id, not a Postgres 22P02',
    (workflowId) => {
      expect(parseListExecutionsQuery({ workflowId })).toMatchObject({ ok: false, code: 'invalid_workflow_id' });
    },
  );

  it('empty values are absent filters, not errors (an unset form field)', () => {
    expect(parseListExecutionsQuery({ status: '', workflowId: '', limit: '', cursor: '' })).toEqual({
      ok: true,
      query: { limit: DEFAULT_LIMIT },
    });
  });

  it('a valid cursor is decoded into the query', () => {
    expect(parseListExecutionsQuery({ cursor: token })).toEqual({
      ok: true,
      query: { limit: DEFAULT_LIMIT, cursor: { createdAt: ISO, id: ID } },
    });
  });

  it('a malformed cursor -> invalid_cursor', () => {
    expect(parseListExecutionsQuery({ cursor: '%%%' })).toMatchObject({ ok: false, code: 'invalid_cursor' });
  });
});

describe('cursor', () => {
  it('round-trips', () => {
    expect(decodeCursor(token)).toEqual({ createdAt: ISO, id: ID });
  });

  it('is base64url: no +, / or = to escape in a query string', () => {
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    { name: 'garbage bytes', cursor: '!!!not-base64!!!' },
    { name: 'empty', cursor: '' },
    { name: 'one part', cursor: base64url(ISO) },
    { name: 'three parts', cursor: base64url(`${ISO}|${ID}|extra`) },
    { name: 'empty timestamp', cursor: base64url(`|${ID}`) },
    { name: 'empty id', cursor: base64url(`${ISO}|`) },
    { name: 'impossible month', cursor: base64url(`2026-13-01T00:00:00.000Z|${ID}`) },
    { name: 'non-canonical timestamp (no millis)', cursor: base64url(`2026-09-18T10:00:00Z|${ID}`) },
    { name: 'non-canonical timestamp (offset)', cursor: base64url(`2026-09-18T12:00:00.123+02:00|${ID}`) },
    { name: 'id not a uuid', cursor: base64url(`${ISO}|e-1`) },
    {
      name: 'signed extended year (round-trips in JS, rejected by Postgres)',
      cursor: base64url(`+010000-01-01T00:00:00.000Z|${ID}`),
    },
    { name: 'negative extended year', cursor: base64url(`-000001-01-01T00:00:00.000Z|${ID}`) },
    { name: 'year zero', cursor: base64url(`0000-01-01T00:00:00.000Z|${ID}`) },
    { name: 'before the epoch', cursor: base64url(`1969-12-31T23:59:59.999Z|${ID}`) },
    { name: 'a base64 character appended (decodes to a stray byte)', cursor: `${token}A` },
  ])('$name -> undefined', ({ cursor }) => {
    expect(decodeCursor(cursor)).toBeUndefined();
  });

  // Node skips characters outside the alphabet; pinned so a stricter decoder is a deliberate change.
  it.each(['!', '=', ' '])(
    'a non-alphabet character appended (%j) is ignored and the token still decodes',
    (suffix) => {
      expect(decodeCursor(`${token}${suffix}`)).toEqual({ createdAt: ISO, id: ID });
    },
  );
});

describe('listExecutionsWhere', () => {
  it('no filters, no tenant -> no WHERE at all', () => {
    expect(listExecutionsWhere({}, null)).toBeUndefined();
  });

  it('tenant present -> own rows plus untenanted rows', () => {
    const rendered = render(listExecutionsWhere({}, 'acme')!);
    expect(rendered.sql).toBe('("executions"."tenant_id" = $1 or "executions"."tenant_id" is null)');
    expect(rendered.params).toEqual(['acme']);
  });

  it('tenant null -> no tenant clause even with other filters', () => {
    const rendered = render(listExecutionsWhere({ status: 'waiting' }, null)!);
    expect(rendered.sql).toBe('"executions"."status" = $1');
    expect(rendered.params).toEqual(['waiting']);
  });

  it('workflowId -> equality on workflow_id', () => {
    const rendered = render(listExecutionsWhere({ workflowId: ID }, null)!);
    expect(rendered.sql).toBe('"executions"."workflow_id" = $1');
    expect(rendered.params).toEqual([ID]);
  });

  it('cursor -> row-value comparison on the truncated sort key, both values bound', () => {
    const rendered = render(listExecutionsWhere({ cursor: { createdAt: ISO, id: ID } }, null)!);
    expect(rendered.sql).toBe(
      `(date_trunc('milliseconds', "executions"."created_at"), "executions"."id") < ($1::timestamptz, $2::uuid)`,
    );
    expect(rendered.params).toEqual([ISO, ID]);
  });

  it('all four compose with AND', () => {
    const rendered = render(
      listExecutionsWhere({ status: 'waiting', workflowId: ID, cursor: { createdAt: ISO, id: ID } }, 'acme')!,
    );
    expect(rendered.sql).toBe(
      '("executions"."status" = $1 and "executions"."workflow_id" = $2 ' +
        'and ("executions"."tenant_id" = $3 or "executions"."tenant_id" is null) ' +
        `and (date_trunc('milliseconds', "executions"."created_at"), "executions"."id") < ($4::timestamptz, $5::uuid))`,
    );
    expect(rendered.params).toEqual(['waiting', ID, 'acme', ISO, ID]);
  });
});

describe('LIST_ORDER', () => {
  it('sorts by the same truncated expression the cursor compares against, then id, both DESC', () => {
    expect(LIST_ORDER.map((term) => render(term).sql)).toEqual([
      `date_trunc('milliseconds', "executions"."created_at") desc`,
      '"executions"."id" desc',
    ]);
  });
});

const row = (index: number) => ({
  id: `0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c${String(index).padStart(2, '0')}`,
  workflowId: 'w-1',
  sourceVersion: 'draft',
  status: 'waiting',
  startedAt: null,
  finishedAt: null,
  createdAt: new Date(Date.UTC(2026, 8, 18, 10, 0, 0, 100 - index)),
  // Never projected by the route; here to prove pageOf would drop them anyway.
  tenantId: 'acme',
  workflowSnapshotJson: { nodes: [] },
});
const rows = (count: number) => Array.from({ length: count }, (_, index) => row(index));

describe('pageOf', () => {
  it('fewer rows than the limit -> all items, no next page', () => {
    const page = pageOf(rows(3), 5);
    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBeNull();
  });

  it('exactly limit rows -> no next page', () => {
    expect(pageOf(rows(5), 5).nextCursor).toBeNull();
  });

  it('limit + 1 rows -> limit items and a cursor for the last returned item', () => {
    const page = pageOf(rows(6), 5);
    expect(page.items).toHaveLength(5);
    expect(page.items.at(-1)!.id).toBe(row(4).id);
    expect(decodeCursor(page.nextCursor!)).toEqual({ createdAt: row(4).createdAt.toISOString(), id: row(4).id });
  });

  it('items carry exactly the seven summary fields', () => {
    for (const item of pageOf(rows(2), 5).items) {
      expect(Object.keys(item).sort()).toEqual(
        ['createdAt', 'finishedAt', 'id', 'sourceVersion', 'startedAt', 'status', 'workflowId'].sort(),
      );
    }
  });

  it('no rows -> empty page', () => {
    expect(pageOf([], 5)).toEqual({ items: [], nextCursor: null });
  });
});
