import type { JsonSchema7 } from '@jsonforms/core';

/**
 * Keys of `bySourceHandleType`, resolved from the handle id: `settled` always, `error` if the id contains `error`,
 * `success` otherwise. See variables-referencing-strategy.decision-log.md § 3.
 */
export const SOURCE_HANDLE_TYPE = {
  SETTLED: 'settled',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
export type SourceHandleType = (typeof SOURCE_HANDLE_TYPE)[keyof typeof SOURCE_HANDLE_TYPE];

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

/**
 * JSON Schema per handle type, resolved from the handle id: `settled` reaches every handle, `error` the handles
 * whose id contains `error` (`onError`, `error-1`), `success` every other handle.
 */
export type PropertiesBySourceHandleType = Partial<Record<SourceHandleType, JsonSchema7>>;

/** JSON Schema per source handle id. A handle receives its own entry plus the matching `bySourceHandleType` buckets. */
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
        /** Handle ids that receive the user-defined variables. */
        toSourceHandles: string[] | undefined;
        /** Handle types that receive them; same keys as `bySourceHandleType`. */
        toSourceHandlesTypes: SourceHandleType[] | undefined;
      };
    }
  | {
      variantRule: {
        fromValueOfPropertyPath: string;
        /** Handle ids that receive the user-defined variables. */
        toSourceHandles: string[] | undefined;
        /** Handle types that receive them; same keys as `bySourceHandleType`. */
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
 * Attach it via `PaletteItem.schemaOutput`. `default` maps a JSON Schema to source handles:
 * `bySourceHandle` by handle id, `bySourceHandleType` by handle type (`settled` for every
 * handle, `error` for ids containing `error`, `success` for the rest). A handle receives its
 * own entry plus the matching type buckets; duplicates are dropped by variable id.
 * `variant` merges every variant whose rule matches the node's current properties.
 *
 * @category Types
 */
export type NodeSchemaOutput = NodeSchemaOutputDefault | NodeSchemaOutputVariant;
