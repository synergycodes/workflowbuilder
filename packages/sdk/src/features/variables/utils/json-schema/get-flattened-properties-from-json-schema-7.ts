import type { JsonSchema7 } from '@jsonforms/core';

import type { FlattenedPropertiesIndex } from '../../../../node/node-output-schema';
import { getIsSupportedVariableType } from './get-is-supported-variable-type';

type Params = {
  properties: JsonSchema7['properties'];
  namePrefix: string;
  rootSchema: JsonSchema7;
};

function getFlattenedPropertiesFromJsonSchema7Properties({
  properties,
  namePrefix,
  rootSchema,
}: Params): FlattenedPropertiesIndex {
  if (!properties) {
    return {};
  }

  const fields = Object.entries(properties).reduce((stack: FlattenedPropertiesIndex, [fieldName, field]) => {
    const propertyName = [namePrefix, fieldName].filter(Boolean).join('.');

    if (getIsSupportedVariableType(field.type)) {
      const isDate = field.type === 'string' && field.format === 'date-time';
      stack[propertyName] = {
        type: isDate ? 'datetime' : field.type,
        label: field.title || '',
        description: field.description || '',
      };
    }

    if (field.type === 'object') {
      const objectFields = getFlattenedPropertiesFromJsonSchema7Properties({
        properties: field.properties,
        namePrefix: propertyName,
        rootSchema,
      });

      stack = {
        ...stack,
        ...objectFields,
      };
    }

    return stack;
  }, {});

  return fields;
}

export function getFlattenedPropertiesFromJsonSchema7(schema: JsonSchema7): FlattenedPropertiesIndex {
  if (schema.type === 'object') {
    const fields = getFlattenedPropertiesFromJsonSchema7Properties({
      properties: schema.properties,
      namePrefix: '',
      rootSchema: schema,
    });

    return {
      response: {
        type: 'object',
        label: 'Response',
      },
      ...fields,
    };
  }

  return {};
}
