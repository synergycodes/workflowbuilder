import type { Node } from '@xyflow/react';

import type { VariablesIndex } from '../../../../features/variables/types';
import { getIsDateType } from '../../../../features/variables/utils/get-is-date-type';
import { getIsLegacyInstantString } from '../../../../utils/time-iso';

const MIGRATION_URL = 'https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/#date-and-time-values';
const EXAMPLES_LIMIT = 3;

export type LegacyDateTimeValue =
  | { kind: 'node'; nodeId: string; path: string; value: string }
  | { kind: 'globalVariable'; name: string; value: string };

type LoadedNode = Pick<Node, 'id' | 'data'>;

/**
 * SDK 3.0 instants in the only slots its pickers wrote: condition rows' `y` and `date` / `datetime` global defaults.
 * Matched by shape, not by key: condition arrays sit under consumer-chosen property names.
 */
export function findLegacyDateTimeValues(
  nodes: readonly LoadedNode[],
  globalVariables?: VariablesIndex,
): LegacyDateTimeValue[] {
  const found: LegacyDateTimeValue[] = [];

  for (const node of nodes) {
    const properties = (node.data as { properties?: unknown } | undefined)?.properties;

    collectFromTree(properties, '', (path, value) => found.push({ kind: 'node', nodeId: node.id, path, value }));
  }

  for (const variable of Object.values(globalVariables ?? {})) {
    if (variable && getIsDateType(variable.type) && getIsLegacyInstantString(variable.defaultValue)) {
      found.push({ kind: 'globalVariable', name: variable.name, value: variable.defaultValue });
    }
  }

  return found;
}

/** One line, up to three locations, ending with the slug the upgrade guide section is keyed on. */
export function formatLegacyDateTimeWarning(found: readonly LegacyDateTimeValue[]): string {
  const examples = found.slice(0, EXAMPLES_LIMIT).map(describeLocation).join(', ');
  const rest = found.length - EXAMPLES_LIMIT;
  const where = rest > 0 ? `${examples} and ${rest} more` : examples;

  return (
    `[@workflowbuilder/sdk] ${found.length} date/datetime value(s) were saved by SDK 3.0 as UTC instants (YYYY-MM-DDTHH:mm:ss.sssZ). ` +
    `4.0 shows the clock written in them, so each is off by its author's UTC offset: ${where}. ` +
    `Re-pick each in the editor or convert the stored data once, see ${MIGRATION_URL} (migration: zone-less-date-time)`
  );
}

/** Warns once per load. Nothing is converted: the author's zone is unknown. */
export function warnIfLegacyDateTimeValues(nodes: readonly LoadedNode[], globalVariables?: VariablesIndex): void {
  const found = findLegacyDateTimeValues(nodes, globalVariables);

  if (found.length > 0) {
    console.warn(formatLegacyDateTimeWarning(found));
  }
}

function describeLocation(item: LegacyDateTimeValue): string {
  return item.kind === 'node' ? `node ${item.nodeId} · ${item.path}` : `global variable '${item.name}'`;
}

function collectFromTree(value: unknown, path: string, onFound: (path: string, value: string) => void): void {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      collectFromTree(item, `${path}[${index}]`, onFound);
    }

    return;
  }

  if (value === null || typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;

  if ('comparisonOperator' in record && typeof record.y === 'string' && getIsLegacyInstantString(record.y)) {
    onFound(joinPath(path, 'y'), record.y);
  }

  for (const key in record) {
    collectFromTree(record[key], joinPath(path, key), onFound);
  }
}

function joinPath(path: string, key: string): string {
  return path ? `${path}.${key}` : key;
}
