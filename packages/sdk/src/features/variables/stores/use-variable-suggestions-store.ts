import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { SuggestionsBySourceHandle, SuggestionsNodeData } from './types';

export type VariablesSuggestionsStore = {
  commonByType: {
    [nodeType: string]: SuggestionsBySourceHandle | undefined;
  };
  byNodeId: {
    [nodeId: string]: SuggestionsNodeData | undefined;
  };
};

export const emptyVariablesSuggestionsStore: VariablesSuggestionsStore = {
  commonByType: {},
  byNodeId: {},
};

export const useVariablesSuggestionsStore = create<VariablesSuggestionsStore>()(
  devtools(
    () =>
      ({
        ...emptyVariablesSuggestionsStore,
      }) satisfies VariablesSuggestionsStore,
    { name: 'variablesSuggestionsStore' },
  ),
);
