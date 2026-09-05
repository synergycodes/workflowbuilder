import type { JsonSchema7 } from '@jsonforms/core';

export type VariableTypePrimitive = 'string' | 'number' | 'boolean' | 'datetime' | 'date';

export type VariableType = VariableTypePrimitive | 'object' | 'array';

export function getVariableTypeIfPrimitive(type: VariableType): VariableTypePrimitive | undefined {
  if (type === 'object' || type === 'array') {
    return;
  }

  return type;
}

export type OutputProperty = {
  type: VariableType;
  label?: string;
  description?: string;
};

export const OUTPUT_SCHEMA_TYPE = {
  DEFAULT: 'default',
  VARIANT: 'variant',
} as const;

export type FlattenedPropertiesIndex = Record<string, OutputProperty>;

export type PropertiesBySourceHandle = {
  [sourceHandle: string]: JsonSchema7 | undefined;
  every?: JsonSchema7;
};

export type OutputVariant =
  | {
      variantRule:
        | undefined
        | {
            onlyIfPropertyNameEquals: { path: string; value: string | number };
          };
      bySourceHandle: PropertiesBySourceHandle;
    }
  | {
      variantRule: {
        onlyIfPropertyNameEquals: { path: string; value: string | number };
        fromValueOfPropertyPath: string;
        toSourceHandles: string[];
      };
    }
  | {
      variantRule: {
        fromValueOfPropertyPath: string;
        toSourceHandles: string[];
      };
    };

export type NodeSchemaOutputDefault = {
  type: 'default';
  bySourceHandle: PropertiesBySourceHandle;
};

export type NodeSchemaOutputVariant = {
  /*
    Predefined variant depending on the value of a property. 
  */
  type: 'variant';
  variants: OutputVariant[];
};

export type NodeSchemaOutput = NodeSchemaOutputDefault | NodeSchemaOutputVariant;
