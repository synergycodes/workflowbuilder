import type { IntegrationDataFormat } from '../../../types/integration';

// Legacy handle IDs were `${nodeId}:source` / `${nodeId}:target`
// (optionally suffixed with `:inner:${innerId}`). The current format drops
// the leading nodeId. This migrates persisted snapshots in place.
const LEGACY_HANDLE_RE = /^.+?:(source|target)(:inner:.+)?$/;

export function migrateLegacyHandleId(handle: string | null | undefined): string | null | undefined {
  if (!handle) return handle;
  const match = LEGACY_HANDLE_RE.exec(handle);
  if (!match) return handle;
  return match[2] ? `${match[1]}${match[2]}` : match[1];
}

export function migrateLegacyHandleIds<T extends Partial<IntegrationDataFormat>>(data: T): T {
  if (!data) return data;

  if (Array.isArray(data.edges)) {
    data = {
      ...data,
      edges: data.edges.map((edge) => ({
        ...edge,
        sourceHandle: migrateLegacyHandleId(edge.sourceHandle) ?? edge.sourceHandle,
        targetHandle: migrateLegacyHandleId(edge.targetHandle) ?? edge.targetHandle,
      })),
    };
  }

  if (Array.isArray(data.nodes)) {
    data = {
      ...data,
      nodes: data.nodes.map(migrateNodeHandleIds),
    };
  }

  return data;
}

function migrateNodeHandleIds<T extends { data?: unknown }>(node: T): T {
  const properties = (node.data as { properties?: Record<string, unknown> } | undefined)?.properties;
  if (!properties) return node;

  const migratedProperties = migrateProperties(properties);
  if (migratedProperties === properties) return node;

  return {
    ...node,
    data: { ...(node.data as object), properties: migratedProperties },
  };
}

function migrateProperties(properties: Record<string, unknown>): Record<string, unknown> {
  let changed = false;
  const next: Record<string, unknown> = { ...properties };

  for (const [key, value] of Object.entries(properties)) {
    if (!Array.isArray(value)) continue;

    const mapped = value.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const record = item as Record<string, unknown>;
      const sourceHandle = record.sourceHandle;
      const targetHandle = record.targetHandle;

      const migratedSource = typeof sourceHandle === 'string' ? migrateLegacyHandleId(sourceHandle) : sourceHandle;
      const migratedTarget = typeof targetHandle === 'string' ? migrateLegacyHandleId(targetHandle) : targetHandle;

      if (migratedSource === sourceHandle && migratedTarget === targetHandle) return item;

      return { ...record, sourceHandle: migratedSource, targetHandle: migratedTarget };
    });

    if (mapped.some((item, index) => item !== value[index])) {
      next[key] = mapped;
      changed = true;
    }
  }

  return changed ? next : properties;
}
