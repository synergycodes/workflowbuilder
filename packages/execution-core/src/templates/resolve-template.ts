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
import type { VariableReference } from '@workflow-builder/types/variables';

import { PermanentNodeExecutionError } from '../errors';
import type { ExecutionContext } from '../execution-context';

type NamespaceOf<Reference> = Reference extends `{{${infer Namespace}.${string}}}` ? Namespace : never;
type Namespace = NamespaceOf<VariableReference>;

// Exhaustive over `VariableReference`: a namespace added to the type fails to compile here.
const SOURCE_BY_NAMESPACE: Record<Namespace, (context: ExecutionContext) => unknown> = {
  nodes: (context) => context.nodeOutputs,
  trigger: (context) => context.triggerPayload,
  variables: (context) => context.variables,
  global: (context) => context.global,
};

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
// The `\s*` after `{{` is wider than the grammar on purpose: `{{ nodes.x }}`
// carries authoring intent, so it is caught here and rejected by the inner
// parse instead of leaking into the prompt.
//
// The body matcher `(?:[^}]|\}(?!\}))*` allows single `}` (e.g. inside a
// default value: `default:'a } b'`) but stops at `}}`, the actual delimiter.
const OUTER_TEMPLATE_REGEX = /\{\{\s*\w+\.(?:[^}]|\}(?!\}))*\}\}/g;

// The reference is a `VariableReference` exactly as the variable picker stores
// it: `{{namespace.path}}` with no whitespace inside the braces. Whitespace is
// tolerated only around the `|` and `:` of the default modifier.
//
// Anatomy of the inner parse regex (anchored to the whole token):
//   ^\{\{                  opening delimiter, the namespace follows immediately
//   (?<namespace>\w+)      nodes | trigger | variables | global (checked against SOURCE_BY_NAMESPACE)
//   \.
//   (?<path>[\w-]+(?:\.[\w-]+)*)
//                          dot-path of non-empty segments: word chars and '-'
//                          (kebab slugs, nanoid ids). Anything else is a typo
//                          and falls through to the 'Malformed template
//                          reference' branch rather than silently passing as
//                          an unresolvable key.
//   (?:                    optional modifier
//     (?<safe>\?)          '?' safe-navigation marker, glued to the path, OR
//     |
//     \s*\|\s*default\s*:\s*'(?<default>[^']*)'   single-quoted default (no nested ')
//   )?
//   \}\}$                  closing delimiter, immediately after the path or modifier
const PARSE_REGEX =
  /^\{\{(?<namespace>\w+)\.(?<path>[\w-]+(?:\.[\w-]+)*)(?:(?<safe>\?)|\s*\|\s*default\s*:\s*'(?<default>[^']*)')?\}\}$/;

export function resolveTemplate(template: string, context: ExecutionContext): string {
  return template.replaceAll(OUTER_TEMPLATE_REGEX, (match) => {
    const { namespace, path, fallback } = parseReference(match);

    const value = getNestedValue(SOURCE_BY_NAMESPACE[namespace](context), path);

    if (value === undefined) {
      if (fallback !== undefined) return fallback;
      throw new PermanentNodeExecutionError('template_unresolved', `Unresolved template reference: ${match}`);
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

type ParsedReference = {
  namespace: Namespace;
  path: string;
  // Substituted when the path resolves to `undefined`; absent for a strict reference.
  fallback: string | undefined;
};

function parseReference(match: string): ParsedReference {
  const groups = PARSE_REGEX.exec(match)?.groups;
  if (!groups) {
    throw new PermanentNodeExecutionError('template_malformed', `Malformed template reference: ${match}`);
  }
  const { namespace, path, safe, default: defaultValue } = groups;

  if (!isNamespace(namespace)) {
    throw new PermanentNodeExecutionError(
      'template_unresolved',
      `Unresolved template reference: ${match} (unknown namespace "${namespace}")`,
    );
  }

  return { namespace, path, fallback: safe === '?' ? '' : defaultValue };
}

function isNamespace(value: string): value is Namespace {
  return Object.hasOwn(SOURCE_BY_NAMESPACE, value);
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
