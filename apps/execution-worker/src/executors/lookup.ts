import { type ExecutionContext, PermanentNodeExecutionError, resolveTemplate } from '@workflow-builder/execution-core';

import type { LookupNode } from '../domain/ai-studio-nodes';

type LookupRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is LookupRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The backend passes node config through unvalidated, so a missing field must still fail as classified.
function parseRecords(records: unknown): Record<string, LookupRecord> {
  if (typeof records !== 'string') {
    throw new PermanentNodeExecutionError('lookup_records_invalid', 'Lookup node has no records');
  }

  let table: unknown;
  try {
    table = JSON.parse(records);
  } catch (error) {
    throw new PermanentNodeExecutionError('lookup_records_invalid', 'Lookup records are not valid JSON', {
      cause: error,
    });
  }

  if (!isPlainObject(table)) {
    throw new PermanentNodeExecutionError(
      'lookup_records_invalid',
      'Lookup records must be a JSON object that maps each key to a record object',
    );
  }

  for (const [key, record] of Object.entries(table)) {
    if (!isPlainObject(record)) {
      throw new PermanentNodeExecutionError(
        'lookup_records_invalid',
        `Lookup record under "${key}" must be a JSON object`,
      );
    }
  }

  return table as Record<string, LookupRecord>;
}

export function executeLookup(node: LookupNode, context: ExecutionContext): { output: LookupRecord } {
  const table = parseRecords(node.config.records);
  const key = typeof node.config.key === 'string' ? resolveTemplate(node.config.key, context).trim() : '';

  if (key === '') {
    throw new PermanentNodeExecutionError('lookup_record_not_found', 'Lookup key is empty');
  }
  // Own keys only: `constructor` or `toString` must not resolve off Object.prototype.
  if (!Object.hasOwn(table, key)) {
    throw new PermanentNodeExecutionError('lookup_record_not_found', `Lookup has no record under the key "${key}"`);
  }

  return { output: table[key]! };
}
