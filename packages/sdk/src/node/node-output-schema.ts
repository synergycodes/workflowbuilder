import type { JsonSchema7 } from '@jsonforms/core';

import type { SourceHandleType } from '../features/variables/constants';

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

export type PropertiesBySourceHandleType = Partial<Record<SourceHandleType, JsonSchema7>>;

export type PropertiesBySourceHandle = {
  [sourceHandle: string]: JsonSchema7 | undefined;
};

export type OutputVariant =
  | {
      variantRule:
        | undefined
        | {
            onlyIfPropertyNameEquals: { path: string; value: string | number };
          };
      bySourceHandle?: PropertiesBySourceHandle;
      bySourceHandleType?: PropertiesBySourceHandleType;
    }
  | {
      variantRule: {
        onlyIfPropertyNameEquals: { path: string; value: string | number };
        fromValueOfPropertyPath: string;
        toSourceHandles: string[] | undefined;
        toSourceHandlesTypes: SourceHandleType[] | undefined;
      };
    }
  | {
      variantRule: {
        fromValueOfPropertyPath: string;
        toSourceHandles: string[] | undefined;
        toSourceHandlesTypes: SourceHandleType[] | undefined;
      };
    };

export type NodeSchemaOutputDefault = {
  type: 'default';
  bySourceHandle?: PropertiesBySourceHandle;
  bySourceHandleType?: PropertiesBySourceHandleType;
};

export type NodeSchemaOutputVariant = {
  /*
    Predefined variant depending on the value of a property. 
  */
  type: 'variant';
  variants: OutputVariant[];
};

/**
 * The output contract of a node: what downstream nodes can reference as variables.
 * Attach it via `PaletteItem.schemaOutput`. `default` maps each source handle to a
 * JSON Schema (`every` covers all handles); `variant` merges every variant whose rule
 * matches the node's current properties.
 *
 * @category Types
 */
export type NodeSchemaOutput = NodeSchemaOutputDefault | NodeSchemaOutputVariant;
