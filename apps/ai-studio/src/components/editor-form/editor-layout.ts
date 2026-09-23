import { hasText } from '../../utils/has-text';
import { schemaFields } from './form-schema';

type EditorControl = { type: 'Text' | 'TextArea' | 'Switch'; scope: string; label: string };

type EditorLayout = { type: 'VerticalLayout'; elements: EditorControl[] };

// The editor's controls are keyed on its own element types, not on JsonForms' generic `Control`. No `integer`:
// the SDK text box hands it over as a string, which fails its schema (follow-up: sdk-text-control-integer).
const CONTROL_BY_TYPE: Record<string, EditorControl['type']> = {
  number: 'Text',
  string: 'TextArea',
  boolean: 'Switch',
};

function pointerSegment(key: string): string {
  return key.replaceAll('~', '~0').replaceAll('/', '~1');
}

/** One editor control per field whose type the editor can edit; a field of another type is not shown. */
export function editorLayout(schema: unknown): EditorLayout {
  const elements = schemaFields(schema).flatMap(([key, field]): EditorControl[] => {
    const type = typeof field['type'] === 'string' ? CONTROL_BY_TYPE[field['type']] : undefined;
    if (type === undefined) {
      return [];
    }
    const title = field['title'];
    return [{ type, scope: `#/properties/${pointerSegment(key)}`, label: hasText(title) ? title : key }];
  });
  return { type: 'VerticalLayout', elements };
}
