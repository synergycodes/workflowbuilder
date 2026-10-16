import { describe, expect, it } from 'vitest';

import type { ExecutionContext } from '../execution-context';
import { resolveTemplate } from './resolve-template';
import { isEditKey, updateContext } from './update-context';

function makeContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    workflowId: 'wf-1',
    executionId: 'exec-1',
    triggerPayload: {},
    nodeOutputs: {},
    variables: {},
    global: {},
    ...overrides,
  };
}

describe('isEditKey', () => {
  it.each(['nodes/draft-1/output/refundAmount', 'nodes/a', 'trigger/customer/email', 'variables/x', 'global/total'])(
    'accepts %s',
    (key) => {
      expect(isEditKey(key)).toBe(true);
    },
  );

  it.each([
    ['an unknown namespace', 'secrets/apiKey'],
    ['a namespace alone', 'nodes'],
    ['a trailing separator', 'nodes/'],
    ['an empty segment', 'nodes//output'],
    ['a dotted reference', 'nodes.draft-1.output'],
    ['the empty string', ''],
    ['a prototype key as the namespace', 'constructor/x'],
  ])('refuses %s', (_name, key) => {
    expect(isEditKey(key)).toBe(false);
  });
});

describe('updateContext', () => {
  it('sets a nested value under the node the key names, so a template reads the edit', () => {
    const context = makeContext({ nodeOutputs: { 'draft-1': { output: { refundAmount: 80, note: 'keep' } } } });

    const updated = updateContext(context, { 'nodes/draft-1/output/refundAmount': 120 });

    expect(updated.nodeOutputs).toEqual({ 'draft-1': { output: { refundAmount: 120, note: 'keep' } } });
    expect(resolveTemplate('{{nodes.draft-1.output.refundAmount}}', updated)).toBe('120');
  });

  it('reaches every namespace', () => {
    const context = makeContext({
      nodeOutputs: { a: { x: 1 } },
      triggerPayload: { b: 1 },
      variables: { c: 1 },
      global: { d: 1 },
    });

    const updated = updateContext(context, { 'nodes/a/x': 2, 'trigger/b': 2, 'variables/c': 2, 'global/d': 2 });

    expect(resolveTemplate('{{nodes.a.x}} {{trigger.b}} {{variables.c}} {{global.d}}', updated)).toBe('2 2 2 2');
  });

  it('creates the levels a path names when the proposal lacks them', () => {
    const updated = updateContext(makeContext(), { 'nodes/draft-1/output/refundAmount': 120 });

    expect(updated.nodeOutputs).toEqual({ 'draft-1': { output: { refundAmount: 120 } } });
  });

  it('replaces a primitive on the way down rather than indexing into it', () => {
    const context = makeContext({ nodeOutputs: { 'draft-1': 'plain text' } });

    const updated = updateContext(context, { 'nodes/draft-1/output': 'edited' });

    expect(updated.nodeOutputs).toEqual({ 'draft-1': { output: 'edited' } });
  });

  it('merges an object edit field by field and keeps the untouched siblings', () => {
    const context = makeContext({
      nodeOutputs: { 'draft-1': { output: { refundAmount: 80, note: 'keep', nested: { a: 1, b: 2 } } } },
    });

    const updated = updateContext(context, { 'nodes/draft-1/output': { refundAmount: 120, nested: { b: 3 } } });

    expect(updated.nodeOutputs).toEqual({
      'draft-1': { output: { refundAmount: 120, note: 'keep', nested: { a: 1, b: 3 } } },
    });
  });

  it('patches a list element by element and takes the edit as its length', () => {
    const context = makeContext({
      nodeOutputs: { 'draft-1': { tags: [{ id: 1, on: true }, { id: 2, on: true }, { id: 3 }] } },
    });

    const updated = updateContext(context, { 'nodes/draft-1/tags': [{ on: false }, { id: 9 }] });

    expect(updated.nodeOutputs).toEqual({
      'draft-1': {
        tags: [
          { id: 1, on: false },
          { id: 9, on: true },
        ],
      },
    });
  });

  it('walks into a list by index', () => {
    const context = makeContext({ nodeOutputs: { 'draft-1': { tags: ['a', 'b'] } } });

    const updated = updateContext(context, { 'nodes/draft-1/tags/1': 'z' });

    expect(updated.nodeOutputs).toEqual({ 'draft-1': { tags: ['a', 'z'] } });
  });

  it('empties a field with null and replaces a container with a primitive', () => {
    const context = makeContext({ nodeOutputs: { 'draft-1': { note: 'x', nested: { a: 1 } } } });

    const updated = updateContext(context, { 'nodes/draft-1/note': null, 'nodes/draft-1/nested': 7 });

    expect(updated.nodeOutputs).toEqual({ 'draft-1': { note: null, nested: 7 } });
  });

  it('applies edits in key order, so a later one wins over an earlier one on the same path', () => {
    const updated = updateContext(makeContext(), { 'nodes/a/x': 1, 'nodes/a': { x: 2 } });

    expect(updated.nodeOutputs).toEqual({ a: { x: 2 } });
  });

  it('never mutates the context it was given, down to the edited leaf', () => {
    const output = { refundAmount: 80, nested: { a: 1 } };
    const context = makeContext({ nodeOutputs: { 'draft-1': { output } }, global: { total: 1 } });
    const before = structuredClone(context);

    const updated = updateContext(context, { 'nodes/draft-1/output/nested/a': 2, 'global/total': 3 });

    expect(context).toEqual(before);
    expect(updated.nodeOutputs['draft-1']).not.toBe(context.nodeOutputs['draft-1']);
    expect(updated.global).not.toBe(context.global);
    expect(updated.variables).toBe(context.variables);
  });

  it('returns the same context for no edits', () => {
    const context = makeContext();

    expect(updateContext(context, {})).toBe(context);
  });

  it('treats a prototype key as an own property, never as the prototype', () => {
    const updated = updateContext(makeContext(), { 'nodes/a/__proto__/polluted': true, 'nodes/a/constructor': 1 });

    expect(Object.hasOwn(updated.nodeOutputs['a'] as object, '__proto__')).toBe(true);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect((updated.nodeOutputs['a'] as Record<string, unknown>)['constructor']).toBe(1);
  });

  it('throws on a key it cannot place, naming the key', () => {
    expect(() => updateContext(makeContext(), { 'secrets/apiKey': 'x' })).toThrow(
      "Malformed edit key: 'secrets/apiKey'",
    );
    expect(() => updateContext(makeContext(), { nodes: {} })).toThrow("Malformed edit key: 'nodes'");
  });
});
