import { useEffect, useState } from 'react';

const GAP_PX = 16;

type RightPanelAnchor = {
  /** Whether the SDK properties panel is expanded to full content height. */
  panelExpanded: boolean;
  /**
   * Distance (px) from the right viewport edge at which a floating element
   * should sit so it hugs the properties panel: left of the panel when it
   * is expanded, at the viewport edge when it is collapsed or absent.
   */
  rightOffset: number;
};

const collapsedAnchor: RightPanelAnchor = { panelExpanded: false, rightOffset: GAP_PX };

/**
 * The SDK does not expose the properties panel's expanded state, so this
 * measures the DOM: the right panel is the element after `#viewport-bounds`
 * in the default layout, and it is expanded when it fills the content height.
 */
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
