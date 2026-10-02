import { beforeEach, describe, expect, it } from 'vitest';

import type { WorkflowBuilderNode } from '../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../store/store';
import { mockNodeDelay } from '../../../utils/validation/get-node-errors.mock';
import type { VariableSuggestion } from '../components/variable-text/variable-text.types';
import { NODE_ID_FOR_COMMON_NODE_DATA, NODE_LABEL_FOR_COMMON_NODE_DATA } from '../constants';
import { SUGGESTION_NODE_TYPE } from '../stores/types';
import { emptyVariablesSuggestionsStore, useVariablesSuggestionsStore } from '../stores/use-variable-suggestions-store';
import type { VariableDefinition } from '../types';
import { getSingleVariableMetadataIfPossible } from './get-single-variable-metadata-if-possible';

const globalTotal: VariableDefinition = {
  id: 'total',
  name: 'Total amount',
  type: 'number',
  defaultValue: '0',
  description: '',
};

function createNode(id: string, nodeType = 'delay'): WorkflowBuilderNode {
  return { ...mockNodeDelay, id, data: { ...mockNodeDelay.data, type: nodeType } };
}

function createSuggestion(id: string, label: string, type: VariableSuggestion['type']): VariableSuggestion {
  return { id, display: label, label, type };
}

describe('getSingleVariableMetadataIfPossible', () => {
  beforeEach(() => {
    resetWorkflowStore();
    useVariablesSuggestionsStore.setState(emptyVariablesSuggestionsStore, true);
  });

  it.each([undefined, '', '   ', 'plain text', '{{global.total}} {{global.total}}', '{{global.total}}x'])(
    'returns undefined for a value that is not a single reference: %j',
    (value) => {
      useStore.setState({ globalVariables: { total: globalTotal } });

      expect(getSingleVariableMetadataIfPossible(value)).toBeUndefined();
    },
  );

  it('returns undefined for a reference with an unknown prefix', () => {
    expect(getSingleVariableMetadataIfPossible('{{unknown.total}}')).toBeUndefined();
  });

  describe('global variables', () => {
    beforeEach(() => {
      useStore.setState({ globalVariables: { total: globalTotal } });
    });

    it('resolves a bracketed reference', () => {
      expect(getSingleVariableMetadataIfPossible('{{global.total}}')).toEqual({
        label: 'Total amount',
        type: 'number',
        reference: '{{global.total}}',
      });
    });

    it('resolves a reference without brackets and returns it bracketed', () => {
      expect(getSingleVariableMetadataIfPossible('global.total')).toEqual({
        label: 'Total amount',
        type: 'number',
        reference: '{{global.total}}',
      });
    });

    it('trims surrounding whitespace', () => {
      expect(getSingleVariableMetadataIfPossible('  {{global.total}}  ')?.reference).toBe('{{global.total}}');
    });

    it('returns undefined when the variable is not defined', () => {
      expect(getSingleVariableMetadataIfPossible('{{global.missing}}')).toBeUndefined();
    });
  });

  describe('previous node variables', () => {
    const nodeId = 'node-1';

    it('resolves a suggestion from a custom-indexed node regardless of its source handle', () => {
      useStore.setState({ nodes: [createNode(nodeId)] });
      useVariablesSuggestionsStore.setState({
        byNodeId: {
          [nodeId]: {
            type: SUGGESTION_NODE_TYPE.CUSTOM,
            bySourceHandle: {
              success: [createSuggestion(`nodes.${nodeId}.output`, 'Output', 'string')],
              error: [createSuggestion(`nodes.${nodeId}.error.message`, 'Error message', 'string')],
            },
          },
        },
      });

      expect(getSingleVariableMetadataIfPossible(`{{nodes.${nodeId}.error.message}}`)).toEqual({
        label: 'Error message',
        type: 'string',
        reference: `{{nodes.${nodeId}.error.message}}`,
      });
    });

    it('resolves a suggestion from a common-indexed node by substituting the node id placeholder', () => {
      useStore.setState({ nodes: [createNode(nodeId, 'http')] });
      useVariablesSuggestionsStore.setState({
        commonByType: {
          http: {
            success: [
              createSuggestion(
                `nodes.${NODE_ID_FOR_COMMON_NODE_DATA}.status`,
                `${NODE_LABEL_FOR_COMMON_NODE_DATA} · status`,
                'number',
              ),
            ],
          },
        },
        byNodeId: {
          [nodeId]: { type: SUGGESTION_NODE_TYPE.COMMON, nodeType: 'http', nodeLabel: 'HTTP' },
        },
      });

      expect(getSingleVariableMetadataIfPossible(`nodes.${nodeId}.status`)).toEqual({
        label: `${NODE_LABEL_FOR_COMMON_NODE_DATA} · status`,
        type: 'number',
        reference: `{{nodes.${nodeId}.status}}`,
      });
    });

    it('returns undefined when the node does not exist in the diagram', () => {
      useVariablesSuggestionsStore.setState({
        byNodeId: {
          [nodeId]: {
            type: SUGGESTION_NODE_TYPE.CUSTOM,
            bySourceHandle: { success: [createSuggestion(`nodes.${nodeId}.output`, 'Output', 'string')] },
          },
        },
      });

      expect(getSingleVariableMetadataIfPossible(`{{nodes.${nodeId}.output}}`)).toBeUndefined();
    });

    it('returns undefined when the node exists but has no indexed suggestions', () => {
      useStore.setState({ nodes: [createNode(nodeId)] });

      expect(getSingleVariableMetadataIfPossible(`{{nodes.${nodeId}.output}}`)).toBeUndefined();
    });

    it('returns undefined when no suggestion matches the property path', () => {
      useStore.setState({ nodes: [createNode(nodeId)] });
      useVariablesSuggestionsStore.setState({
        byNodeId: {
          [nodeId]: {
            type: SUGGESTION_NODE_TYPE.CUSTOM,
            bySourceHandle: { success: [createSuggestion(`nodes.${nodeId}.output`, 'Output', 'string')] },
          },
        },
      });

      expect(getSingleVariableMetadataIfPossible(`{{nodes.${nodeId}.missing}}`)).toBeUndefined();
    });
  });
});
