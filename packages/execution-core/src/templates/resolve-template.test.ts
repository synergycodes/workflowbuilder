import { describe, expect, it } from 'vitest';

import type { ExecutionContext } from '../execution-context';
import { resolveTemplate } from './resolve-template';

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

describe('resolveTemplate — plain {{x.y}} (strict, throws on missing)', () => {
  it('resolves a present top-level reference', () => {
    const context = makeContext({ nodeOutputs: { writer: 'hello' } });
    expect(resolveTemplate('{{nodes.writer}}', context)).toBe('hello');
  });

  it('resolves a present nested reference', () => {
    const context = makeContext({ nodeOutputs: { writer: { response: 'hello' } } });
    expect(resolveTemplate('{{nodes.writer.response}}', context)).toBe('hello');
  });

  it('throws on a missing top-level key — typo surfaces during execution', () => {
    const context = makeContext({ nodeOutputs: { writer: { response: 'hello' } } });
    expect(() => resolveTemplate('{{nodes.missing}}', context)).toThrow(/Unresolved template reference/);
  });

  it('throws on a missing nested key', () => {
    const context = makeContext({ nodeOutputs: { writer: { response: 'hello' } } });
    expect(() => resolveTemplate('{{nodes.writer.typo}}', context)).toThrow(/Unresolved template reference/);
  });

  it('throws on an unknown namespace', () => {
    expect(() => resolveTemplate('{{unknown.x}}', makeContext())).toThrow(/unknown namespace "unknown"/);
  });

  it('supports all four namespaces', () => {
    const context = makeContext({
      nodeOutputs: { a: '1' },
      triggerPayload: { b: '2' },
      variables: { c: '3' },
      global: { d: '4' },
    });
    expect(resolveTemplate('{{nodes.a}} {{trigger.b}} {{variables.c}} {{global.d}}', context)).toBe('1 2 3 4');
  });
});

describe("resolveTemplate — safe-navigation {{x.y?}} (returns '')", () => {
  it("returns '' when the top-level key is missing", () => {
    expect(resolveTemplate('{{nodes.missing?}}', makeContext())).toBe('');
  });

  it("returns '' when a nested key is missing — short-circuits cleanly", () => {
    const context = makeContext({ nodeOutputs: { writer: { response: 'x' } } });
    expect(resolveTemplate('{{nodes.writer.typo?}}', context)).toBe('');
  });

  it("returns '' when an intermediate node in a deep path is missing", () => {
    // `nodes.writer` exists but `nodes.writer.deeply.nested.field` does not —
    // walking the chain should bail at the first undefined and yield ''.
    const context = makeContext({ nodeOutputs: { writer: { response: 'x' } } });
    expect(resolveTemplate('{{nodes.writer.deeply.nested.field?}}', context)).toBe('');
  });

  it('still resolves the actual value when present (modifier is a fallback, not a coercer)', () => {
    const context = makeContext({ nodeOutputs: { writer: 'hello' } });
    expect(resolveTemplate('{{nodes.writer?}}', context)).toBe('hello');
  });

  it('tolerates whitespace before the closing braces', () => {
    expect(resolveTemplate('{{nodes.missing? }}', makeContext())).toBe('');
  });
});

describe("resolveTemplate — default {{x.y | default:'fallback'}}", () => {
  it('returns the default when the reference is missing', () => {
    expect(resolveTemplate("{{nodes.missing | default:'tbd'}}", makeContext())).toBe('tbd');
  });

  it('returns the actual value when present', () => {
    const context = makeContext({ nodeOutputs: { writer: 'hello' } });
    expect(resolveTemplate("{{nodes.writer | default:'tbd'}}", context)).toBe('hello');
  });

  it('tolerates whitespace variations around the pipe and colon', () => {
    expect(resolveTemplate("{{nodes.missing|default:'tbd'}}", makeContext())).toBe('tbd');
    expect(resolveTemplate("{{nodes.missing   |   default  :  'tbd'}}", makeContext())).toBe('tbd');
  });

  it('default body can contain spaces, punctuation, braces', () => {
    expect(resolveTemplate("{{nodes.missing | default:'no value yet — TBD!'}}", makeContext())).toBe(
      'no value yet — TBD!',
    );
    // Single `}` inside the default does not terminate the template.
    expect(resolveTemplate("{{nodes.missing | default:'a } b'}}", makeContext())).toBe('a } b');
  });

  it('empty default is allowed', () => {
    expect(resolveTemplate("{{nodes.missing | default:''}}", makeContext())).toBe('');
  });

  it('default applies on missing nested keys too', () => {
    const context = makeContext({ nodeOutputs: { writer: { response: 'x' } } });
    expect(resolveTemplate("{{nodes.writer.typo | default:'n/a'}}", context)).toBe('n/a');
  });
});

describe('resolveTemplate — mixed templates', () => {
  it('combines plain, safe, and default references in one string', () => {
    const context = makeContext({
      nodeOutputs: { writer: 'hello' },
      variables: { name: 'world' },
    });
    const template =
      "{{nodes.writer}}, {{variables.name}}! optional={{nodes.missing?}} fallback={{nodes.gone | default:'X'}}";
    expect(resolveTemplate(template, context)).toBe('hello, world! optional= fallback=X');
  });

  it('strict reference throws even when other references in the same template are safe', () => {
    // First reference is safe (would resolve to ''), second is strict (missing) →
    // strict still wins. Pin: safe-nav does NOT spread leniency to siblings.
    const context = makeContext();
    expect(() => resolveTemplate('{{nodes.a?}} and {{nodes.b}}', context)).toThrow(/Unresolved template reference/);
  });

  it('non-string values are JSON-stringified', () => {
    const context = makeContext({
      nodeOutputs: { writer: { tokens: 42, items: ['a', 'b'] } },
    });
    expect(resolveTemplate('{{nodes.writer.tokens}}', context)).toBe('42');
    expect(resolveTemplate('{{nodes.writer.items}}', context)).toBe('["a","b"]');
  });

  it('safe-nav on an object reference yields the JSON form, not empty', () => {
    // Modifier only fires when value === undefined; a present object value is
    // still stringified the regular way.
    const context = makeContext({ nodeOutputs: { writer: { ok: true } } });
    expect(resolveTemplate('{{nodes.writer?}}', context)).toBe('{"ok":true}');
  });

  it('falsy-but-present values (empty string, 0, false) bypass the modifier', () => {
    // The modifier only fires for `undefined`. A genuine empty-string output
    // from an upstream node must surface as '', not as the default.
    const context = makeContext({
      nodeOutputs: { writer: { response: '', count: 0, ok: false } },
    });
    expect(resolveTemplate("{{nodes.writer.response | default:'fb'}}", context)).toBe('');
    expect(resolveTemplate("{{nodes.writer.count | default:'fb'}}", context)).toBe('0');
    expect(resolveTemplate("{{nodes.writer.ok | default:'fb'}}", context)).toBe('false');
  });

  it('text without any references passes through unchanged', () => {
    expect(resolveTemplate('plain text, no refs', makeContext())).toBe('plain text, no refs');
  });

  it('leaves "not-a-template" substrings untouched (no dot, no namespace path)', () => {
    // `{{}}`, `{{ }}`, `{{x}}` lack the dot that signals authoring intent.
    // We treat them as plain text rather than as broken templates.
    expect(resolveTemplate('{{}} {{ }} {{x}}', makeContext())).toBe('{{}} {{ }} {{x}}');
  });

  it('multiple references to the same path resolve independently', () => {
    const context = makeContext({ nodeOutputs: { writer: 'hi' } });
    expect(resolveTemplate('{{nodes.writer}}-{{nodes.writer}}', context)).toBe('hi-hi');
  });
});

describe('resolveTemplate — malformed templates throw loudly', () => {
  // The shared principle: anything that *looks like a template* (carries a
  // namespace + dot, i.e. authoring intent) but does not parse as one is a
  // typo we want surfaced — not silently passed through into the LLM prompt
  // or the decision-node condition.

  it("'?' in the middle of a path — not at the very end — throws", () => {
    // User scenario: typo where the safe-nav marker landed mid-word.
    // The outer regex catches `{{nodes.foo?bar}}` (has `nodes.`), the inner
    // parse fails (after `foo` the modifier `?` must be followed by `}}`,
    // but `bar}}` does not match). The whole call throws rather than
    // leaving `{{nodes.foo?bar}}` literally in the output.
    expect(() => resolveTemplate('{{nodes.foo?bar}}', makeContext())).toThrow(/Malformed template reference/);
  });

  it('pipe without a valid default clause throws', () => {
    // `|` is the modifier-introducing char, but anything other than the
    // `default:'…'` form is garbage. Should not silently pass through.
    expect(() => resolveTemplate('{{nodes.foo | something}}', makeContext())).toThrow(/Malformed template reference/);
    expect(() => resolveTemplate('{{nodes.foo | default:no-quotes}}', makeContext())).toThrow(
      /Malformed template reference/,
    );
  });

  it('whitespace inside the dot-path throws', () => {
    // `nodes.foo bar` is not a valid path — keys with spaces are not a
    // thing in our context shape. Surface it instead of pretending to
    // resolve `foo` and leaking ` bar}}` literally.
    expect(() => resolveTemplate('{{nodes.foo bar}}', makeContext())).toThrow(/Malformed template reference/);
  });

  it('trailing garbage after the modifier throws', () => {
    // `{{nodes.foo? extra}}` — modifier looks valid up to `?` but `extra`
    // is not allowed before `}}`.
    expect(() => resolveTemplate('{{nodes.foo? extra}}', makeContext())).toThrow(/Malformed template reference/);
  });

  it('malformed reference next to a valid one — strict failure wins', () => {
    // The valid `{{nodes.writer}}` would resolve fine, but the malformed
    // sibling must abort the whole call. Pin: malformed never silently
    // co-exists with successful resolution.
    const context = makeContext({ nodeOutputs: { writer: 'hi' } });
    expect(() => resolveTemplate('{{nodes.writer}} and {{nodes.foo?bar}}', context)).toThrow(
      /Malformed template reference/,
    );
  });

  it('error message includes the malformed token verbatim', () => {
    // Operator should be able to copy/paste the bad token from the log
    // straight into a find-in-file. Don't sanitize the message.
    expect(() => resolveTemplate('prefix {{nodes.foo?bar}} suffix', makeContext())).toThrow(
      'Malformed template reference: {{nodes.foo?bar}}',
    );
  });
});
