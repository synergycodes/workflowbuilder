import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { isPlainObject } from '../../../utils/is-plain-object';

/**
 * How the form treats a field. Its own vocabulary, not JSON Schema's: `integer` folds into
 * `number`, and a type the form cannot edit is `unsupported` rather than a missing value.
 */
export type DecisionFieldKind = 'number' | 'boolean' | 'text' | 'unsupported';

export type DecisionField = {
  key: string;
  label: string;
  kind: DecisionFieldKind;
  readOnly: boolean;
  required: boolean;
};

export function isDecisionRequest(value: unknown): value is DecisionRequest {
  return isPlainObject(value) && Array.isArray(value['actions']) && isPlainObject(value['schema']);
}

// The one place that reads JSON Schema's type vocabulary. A new kind (enum, date) starts here.
function fieldKindOf(declared: unknown): DecisionFieldKind {
  switch (declared) {
    case 'number':
    case 'integer': {
      return 'number';
    }
    case 'boolean': {
      return 'boolean';
    }
    case 'string': {
      return 'text';
    }
    default: {
      return 'unsupported';
    }
  }
}

export function fieldsOf(request: DecisionRequest): DecisionField[] {
  const properties = isPlainObject(request.schema['properties']) ? request.schema['properties'] : {};
  const declaredRequired = request.schema['required'];
  const required = new Set(
    Array.isArray(declaredRequired) ? declaredRequired.filter((name) => typeof name === 'string') : [],
  );

  return Object.entries(properties).map(([key, declaredValue]) => {
    const declared = isPlainObject(declaredValue) ? declaredValue : {};
    const title = declared['title'];
    return {
      key,
      label: typeof title === 'string' && title.trim().length > 0 ? title : key,
      kind: fieldKindOf(declared['type']),
      readOnly: declared['readOnly'] === true,
      required: required.has(key),
    };
  });
}

export function isEditable(field: DecisionField): boolean {
  return field.kind !== 'unsupported' && !field.readOnly;
}
