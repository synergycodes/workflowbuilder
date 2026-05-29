import type { Edge, Node } from '@xyflow/react';

import { INNER_HANDLE_MARKER } from './types';

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const NEW_FORMAT_INNER_PREFIX = new RegExp(`^(source|target):${INNER_HANDLE_MARKER}:`);
const LEGACY_HANDLE_PATTERN = new RegExp(`^${UUID_PATTERN}:(source|target)(:${INNER_HANDLE_MARKER}:.+)?$`);

/**
 * SDK 2.0.0 persisted handle IDs as `<uuid>:<handleType>[:inner:<innerId>]`.
 * The patch dropped the `<uuid>:` prefix because xyflow already scopes handle
 * IDs by their owning node. Strip the prefix on load so edges saved by 2.0.0
 * resolve their endpoints after upgrade. New-format IDs pass through unchanged.
 * Anything not matching the SDK-produced legacy shape (UUID prefix) is left
 * alone, so user-supplied custom handle IDs are never mis-migrated.
 */
export function migrateLegacyHandleId<T extends string | null | undefined>(handleId: T): T {
  if (!handleId) return handleId;

  if (handleId === 'source' || handleId === 'target') return handleId;
  if (NEW_FORMAT_INNER_PREFIX.test(handleId)) return handleId;

  const match = handleId.match(LEGACY_HANDLE_PATTERN);
  if (match) {
    return `${match[1]}${match[2] ?? ''}` as T;
  }

  return handleId;
}

export function migrateLegacyHandleIdsOnEdges<T extends Pick<Edge, 'sourceHandle' | 'targetHandle'>>(edges: T[]): T[] {
  return edges.map((edge) => {
    const sourceHandle = migrateLegacyHandleId(edge.sourceHandle);
    const targetHandle = migrateLegacyHandleId(edge.targetHandle);

    if (sourceHandle === edge.sourceHandle && targetHandle === edge.targetHandle) {
      return edge;
    }

    return { ...edge, sourceHandle, targetHandle };
  });
}

/**
 * Compound nodes (AI agent tools, decision branches) persist handle IDs
 * inside `node.data.properties` (e.g. `tools[].sourceHandle`). Those
 * strings are passed straight to `<Handle id={...}>` at render time, so
 * if they keep the legacy `<nodeId>:` prefix while edges get migrated,
 * xyflow can't match edges to handles. Walk the properties tree and
 * rewrite any `sourceHandle` / `targetHandle` string the same way edges
 * are rewritten.
 */
export function migrateLegacyHandleIdsOnNodes<T extends Pick<Node, 'data'>>(nodes: T[]): T[] {
  return nodes.map((node) => {
    const properties = (node.data as { properties?: unknown } | undefined)?.properties;
    const migrated = migrateHandleIdsInTree(properties);
    if (migrated === properties) return node;

    return {
      ...node,
      data: { ...(node.data as object), properties: migrated },
    } as T;
  });
}

function migrateHandleIdsInTree(value: unknown): unknown {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const migrated = migrateHandleIdsInTree(item);
      if (migrated !== item) changed = true;
      return migrated;
    });
    return changed ? next : value;
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const key in record) {
      const original = record[key];
      const migrated =
        (key === 'sourceHandle' || key === 'targetHandle') && typeof original === 'string'
          ? migrateLegacyHandleId(original)
          : migrateHandleIdsInTree(original);
      if (migrated !== original) changed = true;
      next[key] = migrated;
    }
    return changed ? next : value;
  }

  return value;
}
