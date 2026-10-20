// Mirrors getFieldKey and getFieldsSchema in apps/ai-studio/src/hooks/node-decision/utils, which build the form
// the decider edits; the parity test beside them checks it. The SDK is not a backend dependency.
const BRACKETS_START = '{{';
const BRACKETS_END = '}}';

type SchemaType = 'string' | 'number' | 'boolean';

// A date travels as text.
const SCHEMA_TYPE_BY_FIELD_TYPE: ReadonlyMap<string, SchemaType> = new Map([
  ['string', 'string'],
  ['number', 'number'],
  ['boolean', 'boolean'],
  ['date', 'string'],
  ['datetime', 'string'],
]);

type FieldPick = { label: string; reference: string; type: string };

function isPick(entry: unknown): entry is FieldPick {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
  const { label, reference, type } = entry as Record<string, unknown>;
  return typeof label === 'string' && typeof reference === 'string' && typeof type === 'string';
}

// The SDK's getVariableReferences: exactly one `{{reference}}`, or a bare one, with no space inside. JsonForms
// joins data paths with dots, so the reference's dots become slashes.
export function fieldKeyOf(reference: string): string | undefined {
  const trimmed = reference.trim();
  if (trimmed.length === 0) return undefined;
  const bracketed = trimmed === '{' || trimmed.startsWith(BRACKETS_START);
  const candidate = bracketed ? trimmed : `${BRACKETS_START}${trimmed}${BRACKETS_END}`;
  const stripped = candidate.replaceAll(BRACKETS_START, '').replaceAll(BRACKETS_END, '');
  const isOneReference =
    candidate.startsWith(BRACKETS_START) &&
    candidate.endsWith(BRACKETS_END) &&
    !candidate.includes(' ') &&
    `${BRACKETS_START}${stripped}${BRACKETS_END}` === candidate;
  if (!isOneReference) return undefined;
  const inner = bracketed ? trimmed.slice(BRACKETS_START.length, -BRACKETS_END.length) : trimmed;
  return inner.replaceAll('.', '/');
}

export type EditableFieldsSchema = {
  type: 'object';
  properties: Record<string, { type: SchemaType; title: string }>;
  required: string[];
};

/** The decision form's schema: one required property per well-formed primitive pick in `editableFields`. */
export function editableFieldsSchema(editableFields: unknown): EditableFieldsSchema {
  const picks = Array.isArray(editableFields) ? editableFields.filter(isPick) : [];
  const properties = Object.fromEntries(
    picks.flatMap((pick): [string, { type: SchemaType; title: string }][] => {
      const key = fieldKeyOf(pick.reference);
      const type = SCHEMA_TYPE_BY_FIELD_TYPE.get(pick.type);
      return key === undefined || type === undefined ? [] : [[key, { type, title: pick.label }]];
    }),
  );
  return { type: 'object', properties, required: Object.keys(properties) };
}
