import type { PaletteItem } from '../../../../../node/common';
import type { WorkflowBuilderNode } from '../../../../../node/node-data';
import { filterEmpty } from '../../../../../utils/array';
import { getByPath } from '../../../../../utils/object';
import { getNodeLabelForVariable } from '../../../utils/diagram/get-node-label-for-variable';
import { getIsSourceHandleType } from '../../../utils/guards/get-is-source-handle-type';
import { getVariablesIndexIfValid } from '../../../utils/guards/get-variables-index-if-valid';
import {
  SUGGESTION_NODE_TYPE,
  type SuggestionNodeType,
  type SuggestionsBySourceHandle,
  type SuggestionsBySourceHandleType,
} from '../../types';
import { getDeprecatedSuggestionsFromOutputSchema } from './get-deprecated-suggestions-from-output-schema';
import { getSuggestionsFromSchemaOutput } from './get-suggestions-from-schema-output';
import { getSuggestionsFromVariablesIndex } from './get-suggestions-from-variables-index';

type Params = {
  definition: PaletteItem;
  node: WorkflowBuilderNode;
};

type Response = {
  type: SuggestionNodeType;
  bySourceHandle: SuggestionsBySourceHandle;
  bySourceHandleType: SuggestionsBySourceHandleType;
};

const EMPTY_NODE_SUGGESTIONS: Response = {
  type: SUGGESTION_NODE_TYPE.CUSTOM,
  bySourceHandle: {},
  bySourceHandleType: {},
};

/**
 * Builds a node's variable suggestions per source handle from `schemaOutput` (or the deprecated `outputSchema`).
 * `common` results depend only on the definition and are shared per node type; `custom` ones depend on node data.
 */
export function getSuggestionsNodeData({ definition, node }: Params): Response {
  const nodeLabel = getNodeLabelForVariable({ node, definition });
  const bySourceHandle: SuggestionsBySourceHandle = {};
  const bySourceHandleType: SuggestionsBySourceHandleType = {};

  if (!definition?.schemaOutput?.type) {
    // outputSchema is deprecated and will be removed in future versions
    if (definition?.outputSchema?.type === 'default') {
      // The old format doesn't return the same value for all handles
      bySourceHandleType['settled'] = [
        ...(bySourceHandleType['settled'] || []),
        ...getDeprecatedSuggestionsFromOutputSchema({
          nodeId: node.id,
          nodeLabel,
          properties: definition.outputSchema.properties,
        }),
      ];

      return {
        type: SUGGESTION_NODE_TYPE.COMMON,
        bySourceHandle,
        bySourceHandleType,
      };
    }

    if (definition?.outputSchema?.type === 'variant') {
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
        bySourceHandleType['settled'] = [
          ...(bySourceHandleType['settled'] || []),
          ...getDeprecatedSuggestionsFromOutputSchema({
            nodeId: node.id,
            nodeLabel,
            properties: variant.properties,
          }),
        ];

        return {
          type: SUGGESTION_NODE_TYPE.CUSTOM,
          bySourceHandle,
          bySourceHandleType,
        };
      }

      return {
        type: SUGGESTION_NODE_TYPE.CUSTOM,
        bySourceHandle: {},
        bySourceHandleType: {},
      };
    }

    return EMPTY_NODE_SUGGESTIONS;
  }

  if (definition.schemaOutput.type === 'default') {
    for (const [sourceHandle, properties] of Object.entries(definition.schemaOutput.bySourceHandle || {})) {
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

    for (const [sourceHandleType, properties] of Object.entries(definition.schemaOutput.bySourceHandleType || {})) {
      if (properties && getIsSourceHandleType(sourceHandleType)) {
        bySourceHandleType[sourceHandleType] = [
          ...(bySourceHandleType[sourceHandleType] || []),
          ...getSuggestionsFromSchemaOutput({
            nodeId: node.id,
            nodeLabel,
            properties,
          }),
        ];
      }
    }
    return {
      type: SUGGESTION_NODE_TYPE.COMMON,
      bySourceHandle,
      bySourceHandleType,
    };
  }

  if (definition.schemaOutput.type === 'variant') {
    const variantsMatchingDataPropertyValue = Object.values(definition.schemaOutput.variants)
      .filter((variant) => {
        if (variant.variantRule && 'onlyIfPropertyNameEquals' in variant.variantRule) {
          const { path, value } = variant.variantRule.onlyIfPropertyNameEquals;
          const isValid = getByPath(node.data.properties, path) === value;

          if (!isValid) {
            return false;
          }
        }

        return true;
      })
      .filter(filterEmpty);

    for (const variant of variantsMatchingDataPropertyValue) {
      if ('bySourceHandle' in variant) {
        for (const [sourceHandle, properties] of Object.entries(variant.bySourceHandle || {})) {
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

      if ('bySourceHandleType' in variant) {
        for (const [sourceHandleType, properties] of Object.entries(variant.bySourceHandleType || {})) {
          if (properties && getIsSourceHandleType(sourceHandleType)) {
            bySourceHandleType[sourceHandleType] = [
              ...(bySourceHandleType[sourceHandleType] || []),
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
        const maybeVariablesIndex = getByPath(node.data.properties, variant.variantRule.fromValueOfPropertyPath);

        const variablesIndex = getVariablesIndexIfValid(maybeVariablesIndex);

        if (variablesIndex) {
          const suggestions = getSuggestionsFromVariablesIndex({
            variablesIndex,
            nodeId: node.id,
            nodeLabel,
            variant: 'nodes',
          });

          for (const sourceHandle of variant.variantRule.toSourceHandles || []) {
            bySourceHandle[sourceHandle] = [...(bySourceHandle[sourceHandle] || []), ...suggestions];
          }

          for (const sourceHandleType of variant.variantRule.toSourceHandlesTypes || []) {
            bySourceHandleType[sourceHandleType] = [...(bySourceHandleType[sourceHandleType] || []), ...suggestions];
          }
        }
      }
    }

    return {
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle,
      bySourceHandleType,
    };
  }

  return EMPTY_NODE_SUGGESTIONS;
}
