import type { SourceHandleType } from '@workflow-builder/types/node-output-schema';

import type { VariableSuggestion } from '../components/variable-text/variable-text.types';

export type SuggestionsBySourceHandle = {
  [sourceHandle: string]: VariableSuggestion[] | undefined;
};

export type SuggestionsBySourceHandleType = Partial<Record<SourceHandleType, VariableSuggestion[]>>;

export type NodeVariablesSuggestions = {
  bySourceHandle: SuggestionsBySourceHandle;
  bySourceHandleType: SuggestionsBySourceHandleType;
};

// Shared per node type; node id and label are placeholders resolved on read
export type CommonNodeSuggestion = {
  bySourceHandle: SuggestionsBySourceHandle;
  bySourceHandleType: SuggestionsBySourceHandleType;
};

export const SUGGESTION_NODE_TYPE = {
  COMMON: 'common',
  CUSTOM: 'custom',
} as const;
export type SuggestionNodeType = (typeof SUGGESTION_NODE_TYPE)[keyof typeof SUGGESTION_NODE_TYPE];

export type SuggestionsNodeData =
  | {
      // References array kept in commonByType (we don't need to store the same array for each node)
      type: typeof SUGGESTION_NODE_TYPE.COMMON;
      nodeType: string;
      nodeLabel: string;
    }
  | {
      // Custom setup for nodes that require configuration based on data in node
      type: typeof SUGGESTION_NODE_TYPE.CUSTOM;
      bySourceHandle: SuggestionsBySourceHandle;
      bySourceHandleType: SuggestionsBySourceHandleType;
    };
