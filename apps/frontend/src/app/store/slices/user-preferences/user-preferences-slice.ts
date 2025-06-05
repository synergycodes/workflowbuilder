import { GetDiagramState, SetDiagramState } from '@/store/store';

export type UserPreferencesState = {
  shouldSkipShowingConfirmation: boolean;
  setShouldSkipShowDeleteConfirmation: (value: boolean) => void;
};

export function useUserPreferencesSlice(set: SetDiagramState, _get: GetDiagramState): UserPreferencesState {
  return {
    shouldSkipShowingConfirmation: false,
    setShouldSkipShowDeleteConfirmation: (value: boolean) => {
      set((state) => {
        const newState = { ...state, shouldSkipShowingConfirmation: value };
        return newState;
      });
    },
  };
}
