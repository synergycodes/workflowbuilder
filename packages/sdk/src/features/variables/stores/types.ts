import type { VariableSuggestion } from '../components/variable-text/variable-text.types';
import type { SPECIAL_SOURCE_HANDLE_KEYWORDS } from '../constants';

export type SuggestionsBySourceHandle = {
  [sourceHandle: string]: VariableSuggestion[] | undefined;
  [SPECIAL_SOURCE_HANDLE_KEYWORDS.EVERY]?: VariableSuggestion[];
  [SPECIAL_SOURCE_HANDLE_KEYWORDS.SUCCESS]?: VariableSuggestion[];
  [SPECIAL_SOURCE_HANDLE_KEYWORDS.ERROR]?: VariableSuggestion[];
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
    }
  | {
      // Custom setup for nodes that require configuration based on data in node
      type: typeof SUGGESTION_NODE_TYPE.CUSTOM;
      bySourceHandle: SuggestionsBySourceHandle;
    };
