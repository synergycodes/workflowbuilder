export type VariableTypePrimitive = 'string' | 'number' | 'boolean' | 'datetime' | 'date';

export type VariableType = VariableTypePrimitive | 'object' | 'array';

export function getVariableTypeIfPrimitive(type: VariableType): VariableTypePrimitive | undefined {
  if (type === 'object' || type === 'array') {
    return;
  }

  return type;
}

export type OutputProperty = {
  type: VariableTypePrimitive;
  label?: string;
  description?: string;
};

export const OUTPUT_SCHEMA_TYPE = {
  DEFAULT: 'default',
  VARIANT: 'variant',
  PROPERTY_VALUE: 'property-value',
} as const;

export type OutputPropertiesIndex = Record<string, OutputProperty | undefined>;

export type OutputVariant = {
  variantRule:
    | undefined
    | {
        sourceHandleId?: string;
        dataPropertyName?: string;
        dataPropertyValue?: string;
      };
  properties: OutputPropertiesIndex;
};

export type NodeOutputSchemaDefault = {
  type: 'default';
  properties: OutputPropertiesIndex;
};

export type NodeOutputSchemaVariant = {
  /*
    Predefined variant depending on the value of a property. 
  */
  type: 'variant';
  variants: {
    [variantName: string]: OutputVariant | undefined;
  };
};

export type NodeOutputSchemaPropertyValue = {
  /*
    Value is built dynamically in the node property.
  */
  type: 'property-value';
  propertyPath: string;
};

export type NodeOutputSchema = NodeOutputSchemaDefault | NodeOutputSchemaVariant | NodeOutputSchemaPropertyValue;
