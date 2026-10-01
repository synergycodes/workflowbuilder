import { type ExecutionContext, PermanentNodeExecutionError, resolveTemplate } from '@workflow-builder/execution-core';

import type { LookupNode } from '../domain/ai-studio-nodes';

type LookupRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is LookupRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The backend passes node config through unvalidated, so a missing field must still fail as classified.
function parseRecords(records: unknown): Record<string, LookupRecord> {
  if (typeof records !== 'string' || records.trim() === '') {
    throw new PermanentNodeExecutionError('lookup_records_invalid', 'Lookup node has no records');
  }

  let table: unknown;
  try {
    table = JSON.parse(records);
  } catch (error) {
    // No `cause`: node_failed reports the deepest cause's message, which would replace this one.
    const reason = error instanceof Error ? error.message : String(error);
    throw new PermanentNodeExecutionError('lookup_records_invalid', `Lookup records are not valid JSON: ${reason}`);
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

// How much of the key a failure message quotes: a key resolved from an AI answer can run to pages.
const KEY_PREVIEW_CHARS = 80;

// The value looked up, shortened, and the reference it came from, if any.
function errorMessageKey(key: string, keyTemplate: string): string {
  const preview = key.length > KEY_PREVIEW_CHARS ? `${key.slice(0, KEY_PREVIEW_CHARS)}…` : key;
  return keyTemplate.trim() === key ? `"${preview}"` : `"${preview}" (${keyTemplate.trim()})`;
}

export function executeLookup(node: LookupNode, context: ExecutionContext): { output: LookupRecord } {
  const table = parseRecords(node.config.records);
  const keyTemplate = typeof node.config.key === 'string' ? node.config.key : '';
  // Trimmed: a model's answer used as the key can carry a trailing newline. Record keys are matched as written.
  const key = resolveTemplate(keyTemplate, context).trim();

  if (key === '') {
    throw new PermanentNodeExecutionError('lookup_key_missing', 'Lookup key is empty');
  }
  // Own keys only: `constructor` or `toString` must not resolve off Object.prototype.
  const record = Object.hasOwn(table, key) ? table[key] : undefined;
  if (record === undefined) {
    throw new PermanentNodeExecutionError(
      'lookup_record_not_found',
      `Lookup has no record under the key ${errorMessageKey(key, keyTemplate)}`,
    );
  }

  return { output: record };
}
