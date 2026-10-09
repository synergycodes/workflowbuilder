import { useRunCollapsesSidePanels } from '../../hooks/use-run-collapses-side-panels';

// Its own component: useSetSelection needs the canvas, which the controls' tests render without.
export function RunSidePanels() {
  useRunCollapsesSidePanels();
  return null;
}
