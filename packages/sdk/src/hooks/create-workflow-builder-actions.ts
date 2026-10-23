import i18n from 'i18next';

import { openExportModal } from '../features/integration/components/import-export/export-modal/open-export-modal';
import { openImportModal } from '../features/integration/components/import-export/import-modal/open-import-modal';
import { openTemplateSelectorModal } from '../features/modals/template-selector/open-template-selector-modal';
import { openModalWorkflowSettings } from '../features/variables/modals/modal-settings';
import { getStoreSelection } from '../store/slices/diagram-selection/actions';
import { getStoreNodes, setStoreNodes } from '../store/slices/diagram-slice/actions';
import { useStore } from '../store/store';
import type { DidSaveStatus } from '../types/integration';
import { getTheme, setTheme } from './theme';
import { fitDiagramView } from './use-fit-view';
import type { WorkflowBuilderActions } from './use-workflow-builder-actions';

const MAX_WORKFLOW_NAME_LENGTH = 128;

type ActionsSession = {
  save: () => Promise<DidSaveStatus>;
  isActive: () => boolean;
};

const store = () => useStore.getState();

export function createWorkflowBuilderActions({ save, isActive }: ActionsSession): WorkflowBuilderActions {
  const whileActive =
    <A extends unknown[]>(action: (...parameters: A) => void) =>
    (...parameters: A) => {
      if (isActive()) action(...parameters);
    };
  const whileEditable = <A extends unknown[]>(action: (...parameters: A) => void) =>
    whileActive((...parameters: A) => {
      if (!store().isReadOnly) action(...parameters);
    });

  return {
    save,

    openSettings: whileActive(openModalWorkflowSettings),
    openImport: whileActive(openImportModal),
    openExport: whileActive(openExportModal),
    openTemplates: whileActive(openTemplateSelectorModal),

    toggleReadOnly: whileActive(() => store().setReadOnly(!store().isReadOnly)),
    setReadOnly: whileActive((value: boolean) => store().setReadOnly(value)),

    togglePalette: whileActive(() => store().setPaletteOpen(!store().isPaletteOpen)),
    setPaletteOpen: whileActive((open: boolean) => store().setPaletteOpen(open)),

    togglePropertiesPanel: whileActive(() => store().setPropertiesPanelOpen(!store().isPropertiesPanelOpen)),
    setPropertiesPanelOpen: whileActive((open: boolean) => store().setPropertiesPanelOpen(open)),

    setPaletteFilter: whileActive((query: string) => store().setPaletteFilter(query)),

    toggleTheme: whileActive(() => setTheme(getTheme() === 'light' ? 'dark' : 'light')),
    setTheme: whileActive(setTheme),

    setLayoutDirection: whileEditable((direction) => store().setLayoutDirection(direction)),
    toggleLayoutDirection: whileEditable(({ flipPositions, fitView } = {}) => {
      store().setLayoutDirection(store().layoutDirection === 'RIGHT' ? 'DOWN' : 'RIGHT');

      // Naive x/y mirror. Goes through setStoreNodes so the nodes stay on
      // the same mutation path as the rest of the editor (schema re-validation
      // included); positions can't change validation, but consistency matters
      // more than the redundant pass.
      if (flipPositions) {
        setStoreNodes(
          getStoreNodes().map((node) => ({ ...node, position: { x: node.position.y, y: node.position.x } })),
        );
      }

      if (fitView) fitDiagramView(store().reactFlowInstance);
    }),

    deleteSelection: whileEditable(() => {
      const { nodes, edges } = getStoreSelection();
      if (nodes.length === 0 && edges.length === 0) return;

      // `onBeforeDelete` in `diagram.tsx` shows the confirmation modal and
      // records the undo entry, the same path the Delete key goes through.
      void store().reactFlowInstance?.deleteElements({ nodes, edges });
    }),

    setLanguage: whileActive((code) => {
      void i18n.changeLanguage(code);
    }),

    setWorkflowName: whileEditable((name: string) => {
      if (name.length > MAX_WORKFLOW_NAME_LENGTH) {
        console.warn(
          `[@workflowbuilder/sdk] setWorkflowName: ignored a name longer than ${MAX_WORKFLOW_NAME_LENGTH} characters.`,
        );
        return;
      }

      store().setWorkflowName(name);
    }),
  };
}
