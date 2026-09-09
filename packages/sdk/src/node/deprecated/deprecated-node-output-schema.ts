import type { FlattenedPropertiesIndex } from '../node-output-schema';

export type DeprecatedOutputVariant = {
  variantRule:
    | undefined
    | {
        dataPropertyName: string;
        dataPropertyValue: string;
      };
  properties: FlattenedPropertiesIndex;
};

export type DeprecatedNodeOutputSchemaDefault = {
  type: 'default';
  properties: FlattenedPropertiesIndex;
};

export type DeprecatedNodeOutputSchemaVariant = {
  /*
    Variants may be set dynamically by the node configuration.
  */
  type: 'variant';
  variants: {
    [variantName: string]: DeprecatedOutputVariant | undefined;
  };
};

export type DeprecatedNodeOutputSchema = DeprecatedNodeOutputSchemaDefault | DeprecatedNodeOutputSchemaVariant;
