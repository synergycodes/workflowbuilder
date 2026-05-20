// Resolves `{{namespace.path}}` references (e.g. `{{nodes.writer-1.response}}`)
// against the execution context.
//
// Three forms are supported. Plain references throw on missing values; the two
// modifiers let template authors opt into a safe fallback explicitly:
//
//   {{nodes.x.response}}                  → throws on missing  (explicit/strict)
//   {{nodes.x.response?}}                 → ''                  (safe-navigation)
//   {{nodes.x.response | default:'tbd'}}  → 'tbd'               (custom fallback)
//
// Keeping plain `{{x.y}}` strict is deliberate: a typo in a prompt template
// should fail loudly during development. The safe forms are an opt-in for
// authors who genuinely expect a value to be absent some of the time.
import type { ExecutionContext } from '../execution-context';

// Two-stage parse: the OUTER regex catches anything that *looks* like a
// template reference (a `{{namespace.…}}` block with a dot — the marker of
// authoring intent). The INNER regex validates the body against the actual
// grammar. If the inner parse fails, we throw a `Malformed template reference`
// error rather than silently leaking the broken token into the resolved
// string — e.g. `{{nodes.foo?bar}}` would otherwise pass through literally
// into an LLM prompt, which is the worst kind of silent failure for a
// flow-authoring tool.
//
// `{{}}`, `{{ }}`, `{{x}}` (no dot) are NOT caught by the outer regex — they
// do not declare a namespace path, so we treat them as plain text.
//
// The body matcher `(?:[^}]|\}(?!\}))*` allows single `}` (e.g. inside a
// default value: `default:'a } b'`) but stops at `}}`, the actual delimiter.
const OUTER_TEMPLATE_REGEX = /\{\{\s*\w+\.(?:[^}]|\}(?!\}))*\}\}/g;

// Anatomy of the inner parse regex (anchored to the whole token):
//   ^\{\{              opening delimiter
//   \s*                tolerate whitespace inside the braces
//   (\w+)              [1] namespace — nodes | trigger | variables | global
//   \.
//   ([^?|}\s]+?)       [2] dot-path — anything but the suffix-introducing chars
//   \s*
//   (?:                non-capturing group for the optional modifier
//     (\?)             [3] '?'  safe-navigation marker, OR
//     |
//     \|\s*default\s*:\s*'([^']*)'   [4] default value (single-quoted, no nested ')
//   )?
//   \s*
//   \}\}$              closing delimiter
const PARSE_REGEX = /^\{\{\s*(\w+)\.([^?|}\s]+?)\s*(?:(\?)|\|\s*default\s*:\s*'([^']*)')?\s*\}\}$/;

export function resolveTemplate(template: string, context: ExecutionContext): string {
  return template.replaceAll(OUTER_TEMPLATE_REGEX, (match) => {
    const parsed = PARSE_REGEX.exec(match);
    if (!parsed) {
      throw new Error(`Malformed template reference: ${match}`);
    }
    const [, namespace, path, safeMarker, defaultValue] = parsed as unknown as [
      string,
      string,
      string,
      string | undefined,
      string | undefined,
    ];

    const source = resolveNamespace(namespace, context, match);
    const value = getNestedValue(source, path);

    if (value === undefined) {
      if (safeMarker === '?') return '';
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Unresolved template reference: ${match}`);
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

function resolveNamespace(namespace: string, context: ExecutionContext, match: string): unknown {
  switch (namespace) {
    case 'nodes': {
      return context.nodeOutputs;
    }
    case 'trigger': {
      return context.triggerPayload;
    }
    case 'variables': {
      return context.variables;
    }
    case 'global': {
      return context.global;
    }
    default: {
      throw new Error(`Unresolved template reference: ${match} (unknown namespace "${namespace}")`);
    }
  }
}

function getNestedValue(object: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = object;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}
