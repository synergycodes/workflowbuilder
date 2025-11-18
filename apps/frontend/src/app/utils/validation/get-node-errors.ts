import Ajv from 'ajv';
import { WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { flatErrors } from './flat-errors';
import { getNodeDefinition } from './get-node-definition';

export function getNodeErrors(node?: WorkflowBuilderNode) {
  const definition = getNodeDefinition(node);

  if (!node || !definition) {
    return [];
  }

  const { schema } = definition;
  // jsonforms uses Ajv but doesn't call strick
  const ajv = new Ajv({ allErrors: true, strict: false });

  const validate = ajv.compile(schema);
  const isValid = validate(node.data.properties);

  if (isValid) {
    return [];
  }

  const flattenErrors = flatErrors(validate.errors);

  return flattenErrors;
}

export function getNodeWithErrors(node: WorkflowBuilderNode) {
  const errors = getNodeErrors(node);

  if (errors.length === 0) {
    return node;
  }

  return {
    ...node,
    data: {
      ...node.data,
      properties: {
        ...node.data.properties,
        errors,
      },
    },
  };
}
