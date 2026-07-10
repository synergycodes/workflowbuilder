import { useEffect, useState } from 'react';

const GAP_PX = 16;

type RightPanelAnchor = {
  panelExpanded: boolean;
  rightOffset: number;
};

const collapsedAnchor: RightPanelAnchor = { panelExpanded: false, rightOffset: GAP_PX };

// The SDK does not expose the properties panel's expanded state, so this
// measures the DOM: the panel is the element after #viewport-bounds.
export function useRightPanelAnchor(): RightPanelAnchor {
  const [anchor, setAnchor] = useState(collapsedAnchor);

  useEffect(() => {
    const anchorElement = document.querySelector('#viewport-bounds')?.nextElementSibling;
    if (!(anchorElement instanceof HTMLElement)) return;
    const panel: HTMLElement = anchorElement;

    function measure() {
      const sidebar = panel.firstElementChild?.firstElementChild;
      const panelExpanded = sidebar instanceof HTMLElement && sidebar.offsetHeight >= panel.offsetHeight * 0.9;

      const next = panelExpanded
        ? {
            panelExpanded,
            rightOffset: Math.round(window.innerWidth - sidebar.getBoundingClientRect().left) + GAP_PX,
          }
        : collapsedAnchor;

      setAnchor((current) =>
        current.panelExpanded === next.panelExpanded && current.rightOffset === next.rightOffset ? current : next,
      );
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return anchor;
}
