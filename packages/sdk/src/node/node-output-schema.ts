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
  label: string;
  description?: string;
};

export const OUTPUT_SCHEMA_TYPE = {
  DEFAULT: 'default',
  VARIANT: 'variant',
} as const;

export type OutputPropertiesIndex = Record<string, OutputProperty>;

export type OutputVariant = {
  variantRule:
    | undefined
    | {
        dataPropertyName: string;
        dataPropertyValue: string;
      };
  properties: OutputPropertiesIndex;
};

export type NodeOutputSchemaDefault = {
  type: 'default';
  properties: OutputPropertiesIndex;
};

export type NodeOutputSchemaVariant = {
  /*
        Variants may be set dynamically by the node configuration.
      */
  type: 'variant';
  variants: {
    [variantName: string]: OutputVariant | undefined;
  };
};

export type NodeOutputSchema = NodeOutputSchemaDefault | NodeOutputSchemaVariant;
