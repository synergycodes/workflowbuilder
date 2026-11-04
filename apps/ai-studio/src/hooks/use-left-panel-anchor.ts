import { useEffect, useState } from 'react';

const GAP_PX = 12;
const EXPANDED_HEIGHT_RATIO = 0.9;

type LeftPanelAnchor = {
  isPanelExpanded: boolean;
  leftOffset: number;
};

const collapsedAnchor: LeftPanelAnchor = { isPanelExpanded: false, leftOffset: GAP_PX };

function findLeftPanel() {
  const panel = document.querySelector('#viewport-bounds')?.previousElementSibling;

  return panel instanceof HTMLElement ? panel : undefined;
}

function measureAnchor(panel: HTMLElement): LeftPanelAnchor {
  const sidebar = panel.firstElementChild;
  if (!(sidebar instanceof HTMLElement)) return collapsedAnchor;

  // Collapsed, the palette is a short pill at the top; the dock then runs to the canvas edge.
  const isPanelExpanded = sidebar.offsetHeight >= panel.offsetHeight * EXPANDED_HEIGHT_RATIO;
  if (!isPanelExpanded) return collapsedAnchor;

  return { isPanelExpanded: true, leftOffset: Math.round(sidebar.getBoundingClientRect().right) + GAP_PX };
}

function sameAnchor(current: LeftPanelAnchor, next: LeftPanelAnchor) {
  return current.isPanelExpanded === next.isPanelExpanded && current.leftOffset === next.leftOffset;
}

function observeAnchor(panel: HTMLElement, onMeasure: (next: LeftPanelAnchor) => void) {
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

// The mirror of useRightPanelAnchor: the palette is the element before #viewport-bounds.
export function useLeftPanelAnchor(): LeftPanelAnchor {
  const [anchor, setAnchor] = useState(collapsedAnchor);

  useEffect(() => {
    const panel = findLeftPanel();
    if (!panel) return;

    return observeAnchor(panel, (next) => setAnchor((current) => (sameAnchor(current, next) ? current : next)));
  }, []);

  return anchor;
}
