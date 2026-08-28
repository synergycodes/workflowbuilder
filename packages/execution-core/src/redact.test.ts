import { describe, expect, it } from 'vitest';

import type { EventEmitterPort } from './ports/event-emitter.port';
import { REDACTED, redactSensitive, withRedactedPayloads } from './redact';

function nest(depth: number): unknown {
  let value: unknown = 'leaf';
  for (let level = 0; level < depth; level += 1) {
    value = { child: value };
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

describe('redactSensitive — key matching', () => {
  it('masks keys containing a sensitive word, across casings and separators', () => {
    const input = {
      apiKey: 'k1',
      api_key: 'k2',
      'API-KEY': 'k3',
      clientSecret: 'k4',
      dbPassword: 'k5',
      passwd: 'k6',
      credentials: 'k7',
      authorizationHeader: 'k8',
      accessKeyId: 'k9',
      privateKey: 'k10',
      connectionString: 'k11',
    };

    expect(redactSensitive(input)).toEqual({
      apiKey: REDACTED,
      api_key: REDACTED,
      'API-KEY': REDACTED,
      clientSecret: REDACTED,
      dbPassword: REDACTED,
      passwd: REDACTED,
      credentials: REDACTED,
      authorizationHeader: REDACTED,
      accessKeyId: REDACTED,
      privateKey: REDACTED,
      connectionString: REDACTED,
    });
  });

  it('masks keys ending with "token" but spares LLM-config lookalikes', () => {
    const input = {
      accessToken: 't1',
      refresh_token: 't2',
      token: 't3',
      maxTokens: 4096,
      tokenLimit: 8192,
      tokenizer: 'cl100k',
    };

    expect(redactSensitive(input)).toEqual({
      accessToken: REDACTED,
      refresh_token: REDACTED,
      token: REDACTED,
      maxTokens: 4096,
      tokenLimit: 8192,
      tokenizer: 'cl100k',
    });
  });

  it('masks exact-match keys without catching their superstrings', () => {
    const input = {
      auth: 'a1',
      bearer: 'a2',
      cookie: 'a3',
      'set-cookie': 'a4',
      pwd: 'a5',
      author: 'Ada',
      oauthProvider: 'github',
    };

    expect(redactSensitive(input)).toEqual({
      auth: REDACTED,
      bearer: REDACTED,
      cookie: REDACTED,
      'set-cookie': REDACTED,
      pwd: REDACTED,
      author: 'Ada',
      oauthProvider: 'github',
    });
  });

  it('replaces the entire subtree under a sensitive key', () => {
    const input = { credentials: { user: 'u', pass: 'p', nested: { deep: true } }, plain: 1 };

    expect(redactSensitive(input)).toEqual({ credentials: REDACTED, plain: 1 });
  });

  it('walks arrays, including AiAgentTool-shaped config lists', () => {
    const input = {
      tools: [
        { id: 't-1', tool: 'search', description: 'web search', apiKey: 'sk-live' },
        { id: 't-2', tool: 'db', description: 'lookup', apiKey: 'sk-other' },
      ],
    };

    expect(redactSensitive(input)).toEqual({
      tools: [
        { id: 't-1', tool: 'search', description: 'web search', apiKey: REDACTED },
        { id: 't-2', tool: 'db', description: 'lookup', apiKey: REDACTED },
      ],
    });
  });
});

describe('redactSensitive — traversal contract', () => {
  it('passes primitives through unchanged', () => {
    expect(redactSensitive('text')).toBe('text');
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(true)).toBe(true);
    expect(redactSensitive(null)).toBeNull();
  });

  it('never mutates the input', () => {
    const input = deepFreeze({
      config: { apiKey: 'sk-live', prompt: 'hello' },
      nodeOutputs: { A: [{ token: 'tok' }] },
    });

    expect(() => redactSensitive(input)).not.toThrow();
    expect(input.config.apiKey).toBe('sk-live');
    expect(input.nodeOutputs.A[0].token).toBe('tok');
  });

  it('is deterministic, preserving key order across calls', () => {
    const input = { b: 1, a: { apiKey: 'x', z: [3, { secret: 's' }] } };

    expect(JSON.stringify(redactSensitive(input))).toBe(JSON.stringify(redactSensitive(input)));
  });

  it('truncates beyond the depth cap', () => {
    const shallow = JSON.stringify(redactSensitive(nest(10)));
    const deep = JSON.stringify(redactSensitive(nest(80)));

    expect(shallow).not.toContain('[TRUNCATED]');
    expect(deep).toContain('[TRUNCATED]');
    expect(deep).not.toContain('leaf');
  });

  it('terminates on cyclic input', () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    expect(JSON.stringify(redactSensitive(cyclic))).toContain('[TRUNCATED]');
  });
});

describe('withRedactedPayloads', () => {
  type EmitCall = { executionId: string; type: string; payload?: unknown; nodeId?: string };
  type StatusCall = { executionId: string; status: string; errorMessage?: string };

  function makeInner(): { port: EventEmitterPort; emits: EmitCall[]; statuses: StatusCall[] } {
    const emits: EmitCall[] = [];
    const statuses: StatusCall[] = [];
    return {
      emits,
      statuses,
      port: {
        async emitEvent(executionId, type, payload, nodeId) {
          emits.push({ executionId, type, payload, nodeId });
        },
        async updateStatus(executionId, status, errorMessage) {
          statuses.push({ executionId, status, errorMessage });
        },
      },
    };
  }

  it('redacts emitted payloads and forwards the other arguments untouched', async () => {
    const inner = makeInner();
    const events = withRedactedPayloads(inner.port);

    await events.emitEvent('exec-1', 'node_started', { config: { apiKey: 'sk-live' }, nodeOutputs: {} }, 'B');

    expect(inner.emits).toEqual([
      {
        executionId: 'exec-1',
        type: 'node_started',
        payload: { config: { apiKey: REDACTED }, nodeOutputs: {} },
        nodeId: 'B',
      },
    ]);
  });

  it('leaves an omitted payload undefined', async () => {
    const inner = makeInner();
    const events = withRedactedPayloads(inner.port);

    await events.emitEvent('exec-1', 'execution_completed');

    expect(inner.emits).toEqual([
      { executionId: 'exec-1', type: 'execution_completed', payload: undefined, nodeId: undefined },
    ]);
  });

  // The runner only fills error.message/code today, but WB-597 subtask 5 will
  // put structured provider errors — which can echo request config — into
  // error.details. The decorator must already cover that shape.
  it('masks sensitive keys inside node_failed error details', async () => {
    const inner = makeInner();
    const events = withRedactedPayloads(inner.port);

    await events.emitEvent(
      'exec-1',
      'node_failed',
      { error: { message: 'provider rejected', code: 'llm_error', details: { request: { apiKey: 'sk-live' } } } },
      'C',
    );

    expect(inner.emits[0].payload).toEqual({
      error: { message: 'provider rejected', code: 'llm_error', details: { request: { apiKey: REDACTED } } },
    });
  });

  it('passes updateStatus through untouched', async () => {
    const inner = makeInner();
    const events = withRedactedPayloads(inner.port);

    await events.updateStatus('exec-1', 'failed', 'boom');

    expect(inner.statuses).toEqual([{ executionId: 'exec-1', status: 'failed', errorMessage: 'boom' }]);
  });
});
