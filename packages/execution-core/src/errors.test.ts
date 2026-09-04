import { describe, expect, it } from 'vitest';

import {
  NodeExecutionError,
  PermanentNodeExecutionError,
  TransientNodeExecutionError,
  classifyNodeError,
  extractDeepestError,
} from './errors';

// Built by hand, not imported from the adapter: the test must fail if the contract moves.
function envelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { wbNodeError: 1, classification: 'transient', code: 'llm_timeout', attempt: 2, ...overrides };
}

// What crosses Temporal: wrapper → adapter failure with envelope → original. Only data survives.
function relayedFailure(details: unknown): Error {
  const failure = Object.assign(new Error('LLM call timed out'), { details });
  return new Error('Activity task failed', { cause: failure });
}

describe('classifyNodeError', () => {
  it('classifies a PermanentNodeExecutionError as permanent', () => {
    expect(classifyNodeError(new PermanentNodeExecutionError('bad_api_key', 'Rejected key'))).toBe('permanent');
  });

  it('classifies a TransientNodeExecutionError as transient', () => {
    expect(classifyNodeError(new TransientNodeExecutionError('llm_timeout', 'Timed out'))).toBe('transient');
  });

  it('leaves the base NodeExecutionError and a plain Error unclassified', () => {
    expect(classifyNodeError(new NodeExecutionError('no_branch_matched', 'No branch'))).toBeUndefined();
    expect(classifyNodeError(new Error('boom'))).toBeUndefined();
    expect(classifyNodeError('not an error')).toBeUndefined();
  });

  it('classifies by shape, so a copy of the class from another bundle still matches', () => {
    // The adapter sees a bundled copy of this module, so shape decides, not `instanceof`.
    const foreign = Object.assign(new Error('Rejected key'), {
      name: 'PermanentNodeExecutionError',
      code: 'bad_api_key',
      classification: 'permanent',
    });

    expect(classifyNodeError(foreign)).toBe('permanent');
  });

  it('ignores a classification field that arrives without a code', () => {
    const foreign = Object.assign(new Error('unrelated library error'), { classification: 'permanent' });

    expect(classifyNodeError(foreign)).toBeUndefined();
  });

  it('ignores a classification value it does not know', () => {
    const foreign = Object.assign(new Error('boom'), { code: 'x', classification: 'maybe' });

    expect(classifyNodeError(foreign)).toBeUndefined();
  });

  it('keeps classifying a consumer subclass that renamed itself', () => {
    class RateLimited extends TransientNodeExecutionError {
      constructor() {
        super('rate_limited', 'Slow down');
        this.name = 'RateLimited';
      }
    }

    expect(classifyNodeError(new RateLimited())).toBe('transient');
  });
});

describe('extractDeepestError — classification envelope', () => {
  it('reads code and attempt from an envelope in the cause chain', () => {
    expect(extractDeepestError(relayedFailure([envelope()]))).toEqual({
      message: 'LLM call timed out',
      code: 'llm_timeout',
      attempt: 2,
    });
  });

  it('keeps the deepest cause message while taking the code from the envelope level', () => {
    const original = new Error('fetch failed: ETIMEDOUT');
    const failure = Object.assign(new Error('LLM call timed out'), { details: [envelope()], cause: original });
    const wrapper = new Error('Activity task failed', { cause: failure });

    expect(extractDeepestError(wrapper)).toEqual({
      message: 'fetch failed: ETIMEDOUT',
      code: 'llm_timeout',
      attempt: 2,
    });
  });

  it('prefers a NodeExecutionError code over an envelope found deeper', () => {
    // Only a hand-built chain has both sources; the first level must win on every replay.
    const inner = Object.assign(new Error('inner'), { details: [envelope({ code: 'from_envelope' })] });
    const outer = new NodeExecutionError('from_error', 'outer', { cause: inner });

    expect(extractDeepestError(outer).code).toBe('from_error');
  });

  it.each([
    ['a wrong brand', envelope({ wbNodeError: 2 })],
    ['an unknown classification', envelope({ classification: 'maybe' })],
    ['a non-string code', envelope({ code: 7 })],
    ['a non-numeric attempt', envelope({ attempt: 'two' })],
    ['a non-object entry', 'not an envelope'],
  ])('ignores an envelope with %s', (_label, malformed) => {
    expect(extractDeepestError(relayedFailure([malformed]))).toEqual({
      message: 'LLM call timed out',
      code: undefined,
      attempt: undefined,
    });
  });

  it('ignores details that are not an array', () => {
    const failure = Object.assign(new Error('LLM call timed out'), { details: envelope() });

    expect(extractDeepestError(failure).attempt).toBeUndefined();
  });

  it('reports no attempt when nothing in the chain carries an envelope', () => {
    expect(extractDeepestError(new Error('boom'))).toEqual({
      message: 'boom',
      code: undefined,
      attempt: undefined,
    });
  });
});
