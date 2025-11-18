import { type Node } from '@xyflow/react';
import { WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { getIsValidJson } from '@/utils/validation/get-is-valid-json';
import { getNodeWithErrors } from '@/utils/validation/get-node-errors';
import { getIsValidLayoutDirections } from '@/utils/validation/get-is-valid-layout-directions';
import { IntegrationDataFormat } from '../types';
import { getNodeDefinition } from '@/utils/validation/get-node-definition';

export type IntegrationDataError = {
  message: string;
  messageParams?: object;
};

type IntegrationDataValidationWithErrors = {
  hasErrors: true;
  errors: IntegrationDataError[];
  warnings: IntegrationDataError[];
  validatedIntegrationData: undefined;
};

type IntegrationDataValidationWithoutErrors = {
  hasErrors: false;
  errors: [];
  warnings: IntegrationDataError[];
  validatedIntegrationData: IntegrationDataFormat;
};

type IntegrationDataValidation = IntegrationDataValidationWithErrors | IntegrationDataValidationWithoutErrors;

export function validateIntegrationData(input?: object | string): IntegrationDataValidation {
  let objectToCheck: Partial<IntegrationDataFormat> | undefined;

  if (typeof input === 'string' && getIsValidJson(input)) {
    objectToCheck = JSON.parse(input);
  } else if (typeof input === 'object') {
    objectToCheck = input;
  }

  if (!objectToCheck) {
    return {
      hasErrors: true,
      errors: [{ message: 'validation.error.notJSONObject' }],
      warnings: [],
      validatedIntegrationData: undefined,
    };
  }

  const validatedIntegrationData: IntegrationDataFormat = {
    name: '',
    layoutDirection: 'RIGHT',
    nodes: [],
    edges: [],
  };

  const errors: IntegrationDataError[] = [];
  const warnings: IntegrationDataError[] = [];

  if (objectToCheck?.name && typeof objectToCheck.name === 'string') {
    validatedIntegrationData.name = objectToCheck.name;
  }

  if (objectToCheck.layoutDirection && getIsValidLayoutDirections(objectToCheck.layoutDirection)) {
    validatedIntegrationData.layoutDirection = objectToCheck.layoutDirection;
  }

  if (Array.isArray(objectToCheck.nodes)) {
    const { knownNodes, unknownNodes } = objectToCheck.nodes.reduce(
      (
        stack: {
          knownNodes: WorkflowBuilderNode[];
          unknownNodes: Node[];
        },
        node,
      ) => {
        if (getNodeDefinition(node)) {
          stack.knownNodes.push(node);
        } else {
          stack.unknownNodes.push(node);
        }

        return stack;
      },
      { knownNodes: [], unknownNodes: [] },
    );

    if (unknownNodes.length > 0) {
      errors.push({
        message: 'validation.error.nodesWithoutDefinition',
        messageParams: { nodesIds: unknownNodes.map((node) => node?.id || '?').join(', ') },
      });
    }

    validatedIntegrationData.nodes = knownNodes.map(getNodeWithErrors);

    const nodesIdsWithErrors = validatedIntegrationData.nodes
      .filter((node) => {
        const errors = node?.data?.properties?.errors;

        return Array.isArray(errors) && errors.length > 0;
      })
      .map((node) => node?.id || '?');

    if (nodesIdsWithErrors.length > 0) {
      warnings.push({
        message: 'validation.error.nodesWithErrors',
        messageParams: { nodesIds: nodesIdsWithErrors.join(', ') },
      });
    }
  }

  if (Array.isArray(objectToCheck.edges)) {
    validatedIntegrationData.edges = objectToCheck.edges;
  }

  const hasErrors = errors.length > 0;

  if (hasErrors) {
    return {
      hasErrors: true,
      errors,
      warnings,
      validatedIntegrationData: undefined,
    };
  }

  return {
    hasErrors: false,
    errors: [],
    warnings,
    validatedIntegrationData,
  };
}
