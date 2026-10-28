import { useRunCollapsesSidePanels } from '../../hooks/use-run-collapses-side-panels';

// Not in AiStudioControls beside useRunLocksCanvas: useSetSelection needs the canvas, which its tests render without.
export function RunSidePanels() {
  useRunCollapsesSidePanels();
  return null;
}
