import { describe, expect, it } from 'vitest';

import { formatErrorChain } from './format-error-chain';

describe('formatErrorChain', () => {
  it('joins the messages down the cause chain', () => {
    const transport = new Error('14 UNAVAILABLE: No connection established');
    const wrapped = new Error('Failed to start Workflow', { cause: transport });

    expect(formatErrorChain(wrapped)).toBe('Failed to start Workflow: 14 UNAVAILABLE: No connection established');
  });

  it('stops on a chain that loops back, even through errors without a message', () => {
    const outer = new Error('outer');
    const silent = new Error('silent', { cause: outer });
    silent.message = '';
    outer.cause = silent;

    expect(formatErrorChain(outer)).toBe('outer');
  });

  it("reads the reasons of an AggregateError without a message, as Node's fetch throws on a refused dual-stack connect", () => {
    const refused = Object.assign(
      new AggregateError(
        [new Error('connect ECONNREFUSED ::1:7233'), new Error('connect ECONNREFUSED 127.0.0.1:7233')],
        'refused',
      ),
      { code: 'ECONNREFUSED' },
    );
    refused.message = '';
    const wrapped = new Error('fetch failed', { cause: refused });

    expect(formatErrorChain(wrapped)).toBe(
      'fetch failed: connect ECONNREFUSED ::1:7233, connect ECONNREFUSED 127.0.0.1:7233',
    );
  });

  it('falls back to the code of an error without a message', () => {
    const coded = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
    coded.message = '';

    expect(formatErrorChain(new Error('fetch failed', { cause: coded }))).toBe('fetch failed: ECONNRESET');
  });

  it('names a thrown value that is not an Error', () => {
    expect(formatErrorChain('boom')).toBe('boom');
  });
});
