/*
  https://json-schema.org/understanding-json-schema/reference/conditionals
*/

export type ObjectFieldRequiredValidationSchema = {
  type?: 'object';
  required?: string[];
};

export type ObjectFieldValidationSchema = ObjectFieldRequiredValidationSchema & {
  properties: Record<string, FieldValidationSchema>;
};

export type StringFieldValidationSchema = {
  type: 'string';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
};

export type NumberFieldValidationSchema = {
  type: 'number';
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
};

export type FieldValidationSchema =
  | ObjectFieldValidationSchema
  | StringFieldValidationSchema
  | NumberFieldValidationSchema;

export type IfThenElseSchema = {
  if: SchemaCondition;
  then?: ConditionalSchema;
  else?: ConditionalSchema;
};

export type SchemaCondition = {
  properties: Record<string, { const?: string | number | boolean }>;
};

export type ConditionalSchema = {
  properties: Record<string, FieldValidationSchema>;
};
