import { IconType } from './common';
import {
  IfThenElseSchema,
  NumberFieldValidationSchema,
  ObjectFieldRequiredValidationSchema,
  StringFieldValidationSchema,
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
  message?: string;
};

export type BaseNodeProperties = {
  label?: string;
  description?: string;
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

export type NodeSchema = ObjectFieldRequiredValidationSchema & {
  properties: NodePropertiesSchema;
  allOf?: IfThenElseSchema[];
};
