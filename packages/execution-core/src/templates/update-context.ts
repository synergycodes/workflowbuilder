// Applies the edits a verdict carries to the context `resolveTemplate` reads, so the
// waves after a decision see the corrected values.
//
// An edit key is a template reference with slashes for dots: `nodes/draft-1/output/amount`
// names what `{{nodes.draft-1.output.amount}}` reads. The decision form stores keys this way
// because JsonForms joins its data paths with dots. The value is a patch: an object merges
// field by field, a list element by element, anything else (including `null`) replaces.
import { CONTEXT_NAMESPACES, type ExecutionContext, isContextNamespace } from '../execution-context';

const EDIT_KEY_SEPARATOR = '/';

export type ContextEdits = Record<string, unknown>;

type EditTarget = {
  bag: (typeof CONTEXT_NAMESPACES)[keyof typeof CONTEXT_NAMESPACES];
  path: readonly string[];
};

function parseEditKey(key: string): EditTarget | undefined {
  const [namespace, ...path] = key.split(EDIT_KEY_SEPARATOR);
  if (namespace === undefined || !isContextNamespace(namespace)) return undefined;
  if (path.length === 0 || path.some((segment) => segment.length === 0)) return undefined;
  return { bag: CONTEXT_NAMESPACES[namespace], path };
}

/** Whether `key` names a context path: a known namespace and at least one non-empty segment. */
export function isEditKey(key: string): boolean {
  return parseEditKey(key) !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ownValue(container: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(container, key) ? container[key] : undefined;
}

function isIndex(segment: string): boolean {
  return String(Number(segment)) === segment && Number(segment) >= 0;
}

function patch(current: unknown, edit: unknown): unknown {
  if (isRecord(current) && isRecord(edit)) {
    const merged: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(edit)) {
      merged[key] = patch(ownValue(current, key), value);
    }
    return merged;
  }
  if (Array.isArray(current) && Array.isArray(edit)) {
    return edit.map((value, index) => patch(current[index], value));
  }
  return edit;
}

// Copy-on-write down the path: the wave that produced `current` keeps reading its own values.
function setAt(current: unknown, path: readonly string[], edit: unknown): unknown {
  if (path.length === 0) return patch(current, edit);
  const [head, ...rest] = path as [string, ...string[]];
  if (Array.isArray(current) && isIndex(head)) {
    const copy = [...current];
    copy[Number(head)] = setAt(current[Number(head)], rest, edit);
    return copy;
  }
  const container = isRecord(current) ? current : {};
  return { ...container, [head]: setAt(ownValue(container, head), rest, edit) };
}

/**
 * The context with every edit applied, in key order. Never mutates `context`. Throws on a key
 * `isEditKey` refuses: callers validate keys where the verdict is accepted.
 */
export function updateContext(context: ExecutionContext, edits: ContextEdits): ExecutionContext {
  let updated = context;
  for (const [key, edit] of Object.entries(edits)) {
    const target = parseEditKey(key);
    if (target === undefined) {
      throw new Error(`Malformed edit key: '${key}' (expected '<namespace>/<path>')`);
    }
    updated = { ...updated, [target.bag]: setAt(updated[target.bag], target.path, edit) };
  }
  return updated;
}
