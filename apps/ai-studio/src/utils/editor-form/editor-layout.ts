import { hasText } from '../has-text';
import { encodePointerSegment, schemaFields } from './form-schema';

type EditorControl = { type: 'Text' | 'TextArea' | 'Switch'; scope: string; label: string };

type EditorLayout = { type: 'VerticalLayout'; elements: EditorControl[] };

// The editor's controls are keyed on its own element types, not on JsonForms' generic `Control`. No `integer`:
// the SDK text box hands it over as a string, which fails its schema (follow-up: sdk-text-control-integer).
const CONTROL_BY_TYPE = new Map<string, EditorControl['type']>([
  ['number', 'Text'],
  ['string', 'TextArea'],
  ['boolean', 'Switch'],
]);

// JsonForms joins data paths with dots and decodes one `~0` per segment; lodash's `set` refuses these names.
const UNSETTABLE_KEYS: ReadonlySet<string> = new Set(['constructor', 'prototype', '__proto__']);

function isAddressable(key: string): boolean {
  return !key.includes('.') && key.split('~').length <= 2 && !UNSETTABLE_KEYS.has(key);
}

// Structured output types an optional field as `[type, 'null']`. The text area and the switch hand over their own
// type, so those two are shown; the text box parses only `number`, so a nullable number is not.
function shownType(type: unknown): string | undefined {
  if (typeof type === 'string') {
    return type;
  }
  const types: unknown[] = Array.isArray(type) ? type.filter((entry) => entry !== 'null') : [];
  const [only] = types;
  return types.length === 1 && (only === 'string' || only === 'boolean') ? only : undefined;
}

/** The control a field is shown with, if the editor can show it at all. */
function controlOf(key: string, field: Record<string, unknown>): EditorControl['type'] | undefined {
  const type = shownType(field['type']);
  return type !== undefined && isAddressable(key) ? CONTROL_BY_TYPE.get(type) : undefined;
}

/** The fields a person can change: shown by the editor and not read-only. Any other field passes through untouched. */
export function editableFields(schema: unknown): Set<string> {
  return new Set(
    schemaFields(schema)
      .filter(([key, field]) => controlOf(key, field) !== undefined && field['readOnly'] !== true)
      .map(([key]) => key),
  );
}

/** One editor control per field whose type the editor can edit; a field of another type is not shown. */
export function editorLayout(schema: unknown): EditorLayout {
  const elements = schemaFields(schema).flatMap(([key, field]): EditorControl[] => {
    const type = controlOf(key, field);
    if (type === undefined) {
      return [];
    }
    const title = field['title'];
    // The SDK label translates any text that is an i18n key, so an untitled key like `validation` shows
    // i18next's notice instead (follow-up: sdk-label-i18n-object-keys).
    return [{ type, scope: `#/properties/${encodePointerSegment(key)}`, label: hasText(title) ? title : key }];
  });
  return { type: 'VerticalLayout', elements };
}
