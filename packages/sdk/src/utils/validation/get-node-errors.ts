import type { WorkflowBuilderNode } from '../../node/node-data';
import { flatErrors } from './flat-errors';
import { getNodeDefinition } from './get-node-definition';
import { workflowBuilderValidator } from './workflow-builder-validator';

export function getNodeErrors(node?: WorkflowBuilderNode) {
  const definition = getNodeDefinition(node);

  if (!node || !definition) {
    return [];
  }

  const { schema } = definition;
  // Uses CSP-safe wrapper instead of Ajv directly to avoid `new Function()` (see workflow-builder-validator.ts)
  const validate = workflowBuilderValidator.compile(schema);
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
