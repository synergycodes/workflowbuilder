import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';
import {
  DiagramDataModificationState,
  useDiagramDataModificationSlice,
} from './slices/diagram-data-modification/diagram-data-modification-slice';
import { PaletteState, usePaletteSlice } from './slices/palette/palette-slice';
import { DiagramSelectionState, useDiagramSelectionSlice } from './slices/diagram-selection/diagram-selection-slice';
import { DiagramState, useDiagramSlice } from './slices/diagram-slice';
import { devtools } from 'zustand/middleware';
import { withInterceptingMiddleware } from './middleware/middleware';
import { shallow } from 'zustand/shallow';
import { UserPreferencesState, useUserPreferencesSlice } from './slices/user-preferences/user-preferences-slice';

export type WorkflowEditorState = DiagramState &
  PaletteState &
  DiagramSelectionState &
  DiagramDataModificationState &
  UserPreferencesState;

export type SetDiagramState = (
  partial:
    | WorkflowEditorState
    | Partial<WorkflowEditorState>
    | ((state: WorkflowEditorState) => WorkflowEditorState | Partial<WorkflowEditorState>),
  replace?: false | undefined,
) => void;

export type GetDiagramState = () => WorkflowEditorState;

const store: StateCreator<WorkflowEditorState> = withInterceptingMiddleware((set, get) => ({
  ...useDiagramSlice(set, get),
  ...useDiagramDataModificationSlice(set, get),
  ...useDiagramSelectionSlice(set, get),
  ...usePaletteSlice(set, get),
  ...useUserPreferencesSlice(set, get),
}))([]);
const useStore = createWithEqualityFn<WorkflowEditorState>()(
  devtools<WorkflowEditorState>(store, {
    enabled: import.meta.env.DEV,
  }),
  shallow,
);

export default useStore;
