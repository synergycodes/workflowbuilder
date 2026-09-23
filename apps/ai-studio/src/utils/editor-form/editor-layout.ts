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

function controlOf(field: Record<string, unknown>): EditorControl['type'] | undefined {
  const type = field['type'];
  return typeof type === 'string' ? CONTROL_BY_TYPE.get(type) : undefined;
}

/** The fields a person can change: shown by the editor and not read-only. Any other field passes through untouched. */
export function editableFields(schema: unknown): Set<string> {
  return new Set(
    schemaFields(schema)
      .filter(([, field]) => controlOf(field) !== undefined && field['readOnly'] !== true)
      .map(([key]) => key),
  );
}

/** One editor control per field whose type the editor can edit; a field of another type is not shown. */
export function editorLayout(schema: unknown): EditorLayout {
  const elements = schemaFields(schema).flatMap(([key, field]): EditorControl[] => {
    const type = controlOf(field);
    if (type === undefined) {
      return [];
    }
    const title = field['title'];
    return [{ type, scope: `#/properties/${encodePointerSegment(key)}`, label: hasText(title) ? title : key }];
  });
  return { type: 'VerticalLayout', elements };
}
