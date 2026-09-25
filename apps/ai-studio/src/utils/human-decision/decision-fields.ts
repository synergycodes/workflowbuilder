import type { JsonSchema } from '@workflowbuilder/sdk';

import { shownFields } from '../editor-form/editor-layout';
import { schemaFields } from '../editor-form/form-schema';
import { hasText } from '../has-text';
import { isPlainObject } from '../is-plain-object';

/** What the author picks per field, in dropdown order. */
export const FIELD_MODES = ['hidden', 'readOnly', 'editable', 'required'] as const;
export type FieldMode = (typeof FIELD_MODES)[number];

/** A field the decider's form can show; `declaration` is the source's, absent for a field only the request stores. */
export type FieldRow = { key: string; title: string; declaration: Record<string, unknown> | undefined };

export function isFieldMode(value: unknown): value is FieldMode {
  return (FIELD_MODES as readonly unknown[]).includes(value);
}

function requiredOf(schema: unknown): unknown[] {
  const required = isPlainObject(schema) ? schema['required'] : undefined;
  return Array.isArray(required) ? required : [];
}

function titleOf(key: string, field: Record<string, unknown>): string {
  const title = field['title'];
  return hasText(title) ? title : key;
}

/** The source's fields in its order, then the fields the request stores and the source no longer declares. */
export function fieldRows(outputSchema: unknown, schema: unknown): FieldRow[] {
  const declared = shownFields(outputSchema);
  const declaredKeys = new Set(declared.map(([key]) => key));
  const storedOnly = shownFields(schema).filter(([key]) => !declaredKeys.has(key));
  return [
    ...declared.map(([key, field]) => ({ key, title: titleOf(key, field), declaration: field })),
    ...storedOnly.map(([key, field]) => ({ key, title: titleOf(key, field), declaration: undefined })),
  ];
}

// The contract's own encoding, so the stored schema is the decider's form: a field it leaves out is Hidden.
export function fieldModeOf(schema: unknown, key: string): FieldMode {
  const declaration = schemaFields(schema).find(([name]) => name === key)?.[1];
  if (declaration === undefined) {
    return 'hidden';
  }
  if (declaration['readOnly'] === true) {
    return 'readOnly';
  }
  return requiredOf(schema).includes(key) ? 'required' : 'editable';
}

/** The schema after one pick: rebuilt from `rows`, so a stored field the editor's form cannot show is dropped. */
export function withFieldMode(schema: JsonSchema, rows: readonly FieldRow[], key: string, mode: FieldMode): JsonSchema {
  const stored = new Map(schemaFields(schema));
  const modeOf = (row: FieldRow) => (row.key === key ? mode : fieldModeOf(schema, row.key));
  const shown = rows.filter((row) => modeOf(row) !== 'hidden');
  const properties = Object.fromEntries(
    shown.map((row) => {
      const entry: Record<string, unknown> = { ...stored.get(row.key), ...row.declaration };
      delete entry['readOnly'];
      return [row.key, modeOf(row) === 'readOnly' ? { ...entry, readOnly: true } : entry];
    }),
  );
  const required = shown.filter((row) => modeOf(row) === 'required').map((row) => row.key);
  const next: Record<string, unknown> = { ...schema, type: 'object', properties, required };
  if (required.length === 0) {
    delete next['required'];
  }
  return next as JsonSchema;
}
