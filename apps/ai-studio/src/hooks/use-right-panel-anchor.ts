import { useEffect, useState } from 'react';

const GAP_PX = 16;
const EXPANDED_HEIGHT_RATIO = 0.9;

type RightPanelAnchor = {
  isPanelExpanded: boolean;
  rightOffset: number;
};

const collapsedAnchor: RightPanelAnchor = { isPanelExpanded: false, rightOffset: GAP_PX };

function findRightPanel() {
  const panel = document.querySelector('#viewport-bounds')?.nextElementSibling;

  return panel instanceof HTMLElement ? panel : undefined;
}

function measureAnchor(panel: HTMLElement): RightPanelAnchor {
  const sidebar = panel.firstElementChild?.firstElementChild;
  if (!(sidebar instanceof HTMLElement)) return collapsedAnchor;

  const isPanelExpanded = sidebar.offsetHeight >= panel.offsetHeight * EXPANDED_HEIGHT_RATIO;
  if (!isPanelExpanded) return collapsedAnchor;

  return {
    isPanelExpanded: true,
    rightOffset: Math.round(window.innerWidth - sidebar.getBoundingClientRect().left) + GAP_PX,
  };
}

function sameAnchor(current: RightPanelAnchor, next: RightPanelAnchor) {
  return current.isPanelExpanded === next.isPanelExpanded && current.rightOffset === next.rightOffset;
}

function observeAnchor(panel: HTMLElement, onMeasure: (next: RightPanelAnchor) => void) {
  const updateAnchor = () => onMeasure(measureAnchor(panel));

  updateAnchor();

  const observer = new ResizeObserver(updateAnchor);
  observer.observe(panel);
  window.addEventListener('resize', updateAnchor);

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', updateAnchor);
  };
}

// The SDK does not expose the properties panel's expanded state, so this
// measures the DOM: the panel is the element after #viewport-bounds.
export function useRightPanelAnchor(): RightPanelAnchor {
  const [anchor, setAnchor] = useState(collapsedAnchor);

  useEffect(() => {
    const panel = findRightPanel();
    if (!panel) return;

    return observeAnchor(panel, (next) => setAnchor((current) => (sameAnchor(current, next) ? current : next)));
  }, []);

  return anchor;
}
