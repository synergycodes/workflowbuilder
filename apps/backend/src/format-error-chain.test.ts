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

  it('names a thrown value that is not an Error', () => {
    expect(formatErrorChain('boom')).toBe('boom');
  });
});
