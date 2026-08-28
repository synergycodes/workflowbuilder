import type { PaletteItem } from '../../../../../node/common';
import type { WorkflowBuilderNode } from '../../../../../node/node-data';
import { OUTPUT_SCHEMA_TYPE } from '../../../../../node/node-output-schema';
import { filterEmpty } from '../../../../../utils/array';
import { getByPath } from '../../../../../utils/object';
import type { VariablesIndex } from '../../../types';
import { getNodeLabelForVariable } from '../../../utils/diagram/get-node-label-for-variable';
import { SUGGESTION_NODE_TYPE, type SuggestionNodeType, type SuggestionsBySourceHandle } from '../../types';
import { getDeprecatedSuggestionsFromOutputSchema } from './get-deprecated-suggestions-from-output-schema.ts';
import { getSuggestionsFromSchemaOutput } from './get-suggestions-from-schema-ouput';
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
    every: [],
  },
};

export function getSuggestionsNodeData({ definition, node }: Params): Response {
  const nodeLabel = getNodeLabelForVariable({ node, definition });
  const bySourceHandle: SuggestionsBySourceHandle = {
    every: [],
  };

  if (!definition?.schemaOutput?.type) {
    // outputSchema is deprecated and will be removed in future versions
    if (definition?.outputSchema?.type === OUTPUT_SCHEMA_TYPE.DEFAULT) {
      // The old format doesn't return the same value for all handles
      bySourceHandle['every'] = [
        ...(bySourceHandle['every'] || []),
        ...getDeprecatedSuggestionsFromOutputSchema({
          nodeId: node.id,
          nodeLabel,
          properties: definition.outputSchema.properties,
        }),
      ];

      return {
        // type: SUGGESTION_NODE_TYPE.COMMON,
        type: SUGGESTION_NODE_TYPE.CUSTOM,
        bySourceHandle,
      };
    }

    if (definition?.outputSchema?.type === OUTPUT_SCHEMA_TYPE.VARIANT) {
      // The old format accepted only one rule at the time, newer merges multiple rules
      const variant = Object.values(definition.outputSchema.variants).find((variant) => {
        if (!variant?.variantRule) {
          return true;
        }

        const { dataPropertyName, dataPropertyValue } = variant.variantRule;

        if (node.data.properties[dataPropertyName] === dataPropertyValue) {
          return true;
        }

        return false;
      });

      if (variant) {
        bySourceHandle['every'] = [
          ...(bySourceHandle['every'] || []),
          ...getDeprecatedSuggestionsFromOutputSchema({
            nodeId: node.id,
            nodeLabel,
            properties: variant.properties,
          }),
        ];

        return {
          type: SUGGESTION_NODE_TYPE.CUSTOM,
          bySourceHandle,
        };
      }

      return {
        type: SUGGESTION_NODE_TYPE.CUSTOM,
        bySourceHandle: {},
      };
    }

    return EMPTY_NODE_SUGGESTIONS;
  }

  // Node that always returns the same variables
  if (definition.schemaOutput.type === OUTPUT_SCHEMA_TYPE.DEFAULT) {
    for (const [sourceHandle, properties] of Object.entries(definition.schemaOutput.bySourceHandle)) {
      if (properties) {
        bySourceHandle[sourceHandle] = [
          ...(bySourceHandle[sourceHandle] || []),
          ...getSuggestionsFromSchemaOutput({
            nodeId: node.id,
            nodeLabel,
            properties,
          }),
        ];
      }
    }

    return {
      // type: SUGGESTION_NODE_TYPE.COMMON,
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle,
    };
  }

  // From variants (they have rules based on data inside the node)
  if (definition.schemaOutput.type === OUTPUT_SCHEMA_TYPE.VARIANT) {
    const variantsMatchingDataPropertyValue = Object.values(definition.schemaOutput.variants)
      .filter((variant) => {
        if (variant.variantRule && 'onlyIfPropertyNameEquals' in variant.variantRule) {
          const { path, value } = variant.variantRule.onlyIfPropertyNameEquals;
          const isValid = getByPath(node.data.properties, path) === value;

          if (!isValid) {
            return false;
          }
        }

        // No rule is always a match
        return true;
      })
      .filter(filterEmpty);

    for (const variant of variantsMatchingDataPropertyValue) {
      // Default variables by sourceHandle
      if ('bySourceHandle' in variant) {
        for (const [sourceHandle, properties] of Object.entries(variant.bySourceHandle)) {
          if (properties) {
            bySourceHandle[sourceHandle] = [
              ...(bySourceHandle[sourceHandle] || []),
              ...getSuggestionsFromSchemaOutput({
                nodeId: node.id,
                nodeLabel,
                properties,
              }),
            ];
          }
        }
      }

      if (
        variant.variantRule &&
        'fromValueOfPropertyPath' in variant.variantRule &&
        variant.variantRule.fromValueOfPropertyPath
      ) {
        const variablesIndex = getByPath(
          node.data.properties,
          variant.variantRule.fromValueOfPropertyPath,
        ) as unknown as VariablesIndex | undefined;

        const sourceHandlesToAdd = variant.variantRule.toSourceHandles;

        // TODO: Add better guard
        // It's an output of schema-builder control
        if (variablesIndex) {
          const suggestions = getSuggestionsFromVariableIndex({
            variablesIndex,
            nodeId: node.id,
            nodeLabel,
            variant: 'nodes',
          });

          for (const sourceHandle of sourceHandlesToAdd) {
            console.log(sourceHandle);
            bySourceHandle[sourceHandle] = [...(bySourceHandle[sourceHandle] || []), ...suggestions];
          }
        }
      }
    }

    return {
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle,
    };
  }

  return EMPTY_NODE_SUGGESTIONS;
}
