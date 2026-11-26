import i18n from 'i18next';

import { trackFutureChange } from '../features/changes-tracker/stores/use-changes-tracker-store';
import { openExportModal } from '../features/integration/components/import-export/export-modal/open-export-modal';
import { openImportModal } from '../features/integration/components/import-export/import-modal/open-import-modal';
import { openTemplateSelectorModal } from '../features/modals/template-selector/open-template-selector-modal';
import { isCleanUpBlocked, isVersionPublishable } from '../features/ui-extensions/header-action-rules';
import type { UiExtensionRegistry } from '../features/ui-extensions/ui-extension-registry';
import { openModalWorkflowSettings } from '../features/variables/modals/modal-settings';
import { type LayoutDirection, layoutDirections } from '../node/common';
import { getStoreSelection } from '../store/slices/diagram-selection/actions';
import { getStoreNodes, setStoreNodes } from '../store/slices/diagram-slice/actions';
import { useStore } from '../store/store';
import type { DidSaveStatus } from '../types/integration';
import { loadDiagramModel } from './load-diagram-model';
import { getTheme, setTheme } from './theme';
import { fitDiagramView } from './use-fit-view';
import type { WorkflowBuilderActions } from './use-workflow-builder-actions';

const MAX_WORKFLOW_NAME_LENGTH = 128;

type ActionsSession = {
  save: () => Promise<DidSaveStatus>;
  isActive: () => boolean;
  /** Where the editor header's host supplies are registered; `null` outside a Root. */
  registry: UiExtensionRegistry | null;
};

const store = () => useStore.getState();

function isLayoutDirection(value: unknown): value is LayoutDirection {
  return (layoutDirections as readonly unknown[]).includes(value);
}

// `cleanUp` never rejects, and the built-in discards its promise, so a host bug would otherwise leave no trace.
function reportCleanUpFailure(error: unknown) {
  console.error('[@workflowbuilder/sdk] The supplied Clean up failed:', error);
}

export function createWorkflowBuilderActions({ save, isActive, registry }: ActionsSession): WorkflowBuilderActions {
  const whileActive =
    <A extends unknown[]>(action: (...parameters: A) => void) =>
    (...parameters: A) => {
      if (isActive()) action(...parameters);
    };
  const canEdit = () => isActive() && !store().isReadOnly;
  const whileEditable =
    <A extends unknown[]>(action: (...parameters: A) => void) =>
    (...parameters: A) => {
      if (canEdit()) action(...parameters);
    };
  // Busy starts only after the host returns, so without this a `cleanUp()` inside `onCleanUp` recurses.
  let isCleanUpHostRunning = false;

  return {
    save,

    openSettings: whileActive(openModalWorkflowSettings),
    openImport: whileEditable(openImportModal),
    openExport: whileActive(openExportModal),
    openTemplates: whileActive(openTemplateSelectorModal),
    loadWorkflow: whileEditable(loadDiagramModel),

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

    cleanUp: async (direction?: LayoutDirection) => {
      const { isReadOnly, nodes } = store();
      const isBlocked = isCleanUpBlocked({ isReadOnly, isCanvasEmpty: nodes.length === 0 });
      if (!isActive() || !registry || isBlocked || isCleanUpHostRunning) return;
      const onCleanUp = registry.getHeaderSupply('cleanUp');
      if (!onCleanUp || registry.isCleanUpPending()) return;

      const current = store().layoutDirection;
      // `cleanUp` passed straight as an `onClick` receives the click event here.
      const next = isLayoutDirection(direction) ? direction : current;
      if (next !== current) {
        trackFutureChange('layoutDirection', { direction: next });
        store().setLayoutDirection(next);
      }

      let result: void | Promise<void>;
      isCleanUpHostRunning = true;
      try {
        result = onCleanUp(next);
      } catch (error) {
        reportCleanUpFailure(error);
        return;
      } finally {
        isCleanUpHostRunning = false;
      }
      if (!(result instanceof Promise)) return;

      registry.setCleanUpPending(true);
      try {
        await result;
      } catch (error) {
        reportCleanUpFailure(error);
      } finally {
        registry.setCleanUpPending(false);
      }
    },

    saveAsPdf: whileActive(() => registry?.getHeaderSupply('saveAsPdf')?.()),

    publish: whileActive(() => {
      if (registry && isVersionPublishable(registry.getHeaderSupply('version')))
        registry.getHeaderSupply('publish')?.();
    }),
  };
}
