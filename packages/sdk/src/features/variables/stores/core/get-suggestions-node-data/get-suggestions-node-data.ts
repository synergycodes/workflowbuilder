import type { PaletteItem } from '../../../../../node/common';
import type { WorkflowBuilderNode } from '../../../../../node/node-data';
import { OUTPUT_SCHEMA_TYPE } from '../../../../../node/node-output-schema';
import { filterEmpty } from '../../../../../utils/array';
import { getByPath } from '../../../../../utils/object';
import type { VariablesIndex } from '../../../types';
import { getNodeLabelForVariable } from '../../../utils/diagram/get-node-label-for-variable';
import { SUGGESTION_NODE_TYPE, type SuggestionNodeType, type SuggestionsBySourceHandle } from '../../types';
import { getSuggestionsFromOutputProperties } from './get-suggestions-from-output-properties';
import { getSuggestionsFromVariableIndex } from './get-suggestions-from-variables-index';

type Params = {
  definition: PaletteItem;
  node: WorkflowBuilderNode;
};

type Response = {
  type: SuggestionNodeType;
  bySourceHandle: SuggestionsBySourceHandle;
};

const EMPTY_NODE_SUGGESTIONS: Response = {
  type: SUGGESTION_NODE_TYPE.COMMON,
  bySourceHandle: {
    default: [],
  },
};

export function getSuggestionsNodeData({ definition, node }: Params): Response {
  const nodeLabel = getNodeLabelForVariable({ node, definition });

  if (!definition?.outputSchema?.type) {
    return EMPTY_NODE_SUGGESTIONS;
  }

  // Node that always returns the same variables
  if (definition.outputSchema.type === OUTPUT_SCHEMA_TYPE.DEFAULT) {
    return {
      type: SUGGESTION_NODE_TYPE.COMMON,
      bySourceHandle: {
        default: getSuggestionsFromOutputProperties({
          nodeId: node.id,
          nodeLabel,
          properties: definition.outputSchema.properties,
        }),
      },
    };
  }

  // From variants (they have rules based on data inside the node and edges)
  if (definition.outputSchema.type === OUTPUT_SCHEMA_TYPE.VARIANT) {
    const variantsMatchingDataPropertyValue = Object.values(definition.outputSchema.variants)
      .filter((variant) => {
        if (!variant?.variantRule) {
          return true;
        }

        // We assume true if rule isn't set - the rule can be set for sourceHandle only
        const isValidPropertyValue =
          'dataPropertyName' in variant.variantRule && variant.variantRule.dataPropertyName
            ? node.data.properties[variant.variantRule.dataPropertyName] === variant.variantRule.dataPropertyValue
            : true;

        return isValidPropertyValue;
      })
      .filter(filterEmpty);

    const bySourceHandle: SuggestionsBySourceHandle = {
      default: [],
    };

    for (const variant of variantsMatchingDataPropertyValue) {
      const sourceHandle = variant.variantRule?.sourceHandleId || 'default';
      bySourceHandle[sourceHandle] = [
        ...(bySourceHandle[sourceHandle] || []),
        ...getSuggestionsFromOutputProperties({
          nodeId: node.id,
          nodeLabel,
          properties: variant.properties,
        }),
      ];
    }

    return {
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle,
    };
  }

  // Build with schema builder control
  if (definition?.outputSchema.type === OUTPUT_SCHEMA_TYPE.PROPERTY_VALUE) {
    // TODO: Add better guard
    const variablesIndex = getByPath(node.data.properties, definition.outputSchema.propertyPath) as unknown as
      | VariablesIndex
      | undefined;

    if (!variablesIndex) {
      return {
        ...EMPTY_NODE_SUGGESTIONS,
        /*
          It's custom because it has built-in controls, and even if it's empty, that doesn't mean the others are empty too.
        */
        type: SUGGESTION_NODE_TYPE.CUSTOM,
      };
    }

    const suggestions = getSuggestionsFromVariableIndex({
      variablesIndex,
      nodeId: node.id,
      nodeLabel,
      variant: 'nodes',
    });

    return {
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle: {
        default: suggestions,
      },
    };
  }

  return EMPTY_NODE_SUGGESTIONS;
}
