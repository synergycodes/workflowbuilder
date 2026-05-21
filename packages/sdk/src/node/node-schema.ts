import type { ErrorObject } from 'ajv';

import type { IconType } from './common';
import {
  type IfThenElseSchema,
  type NumberFieldValidationSchema,
  type ObjectFieldRequiredValidationSchema,
  type StringFieldValidationSchema,
} from './node-validation-schema';

export type PrimitiveFieldType = 'string' | 'number' | 'boolean';

export type ItemOption = {
  label: string;
  value: string;
  icon?: IconType;
  type?: 'item';
};

type SeparatorOption = {
  type: 'separator';
};

/**
 * Single entry in a Select control's option list — either an item
 * (label + value, optionally an icon) or a visual separator.
 *
 * @category Types
 */
export type Option = ItemOption | SeparatorOption;

type BaseFieldSchema = {
  label?: string;
  placeholder?: string;
};

type ArrayFieldSchema = BaseFieldSchema & {
  type: 'array';
  items: {
    type: 'object';
    properties: Record<string, FieldSchema>;
  };
};

type ObjectFieldSchema = BaseFieldSchema &
  ObjectFieldRequiredValidationSchema & {
    type: 'object';
    properties: Record<string, FieldSchema>;
  };

type DateFieldSchema = BaseFieldSchema & {
  type: 'string';
};

type StringFieldSchema = BaseFieldSchema & StringFieldValidationSchema;

type NumberFieldSchema = BaseFieldSchema & NumberFieldValidationSchema;

type BooleanFieldSchema = BaseFieldSchema & {
  type: 'boolean';
};

export type PrimitiveFieldSchema = (StringFieldSchema | NumberFieldSchema | BooleanFieldSchema) & {
  options?: Option[];
};

export type FieldSchema = PrimitiveFieldSchema | ArrayFieldSchema | ObjectFieldSchema | DateFieldSchema;

export type FlatError = {
  keyword: string;
  instancePath: string;
  schemaPath: string;
  schema?: string[];
  message?: string;
};

export type BaseNodeProperties = {
  label?: string;
  description?: string;
  errors?: FlatError[] | undefined;
  // Not JSON schema errors, but errors generated externally based on edges or other factors.
  customErrors?: ErrorObject[] | undefined;
};

export type BaseNodePropertiesSchema = {
  label: {
    type: 'string';
  };
  description: {
    type: 'string';
  };
};

export type NodeProperties = BaseNodeProperties & Record<string, unknown>;

export type NodePropertiesSchema = BaseNodePropertiesSchema & Record<string, FieldSchema>;

export type NodeFieldType = FieldSchema['type'];

/**
 * JSON-schema-like description of a node type's editable properties.
 *
 * Drives three things at runtime:
 *
 * 1. **Validation** — values are checked against this shape; failures bubble
 *    into `NodeData.properties.errors` for UI display.
 * 2. **Rendering** — JsonForms uses the schema (combined with an optional
 *    {@link UISchema}) to render the property panel.
 * 3. **Type inference** — `NodeDataProperties<MySchema>` extracts a precise
 *    TypeScript type for a node's `properties`.
 *
 * @category Types
 */
export type NodeSchema = ObjectFieldRequiredValidationSchema & {
  properties: NodePropertiesSchema;
  allOf?: IfThenElseSchema[];
};
