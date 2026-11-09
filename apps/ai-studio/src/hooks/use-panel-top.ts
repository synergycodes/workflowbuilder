import { useEffect, useState } from 'react';

function observeTop(bounds: Element, onMeasure: (top: number) => void) {
  const updateTop = () => onMeasure(Math.round(bounds.getBoundingClientRect().top));

  updateTop();

  // A wrapping header grows downwards and shortens the bounds, so their size change marks the move.
  const observer = new ResizeObserver(updateTop);
  observer.observe(bounds);
  window.addEventListener('resize', updateTop);

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', updateTop);
  };
}

// The SDK does not expose its header height, so this measures the DOM:
// #viewport-bounds starts where the side panels do.
export function usePanelTop(): number | undefined {
  const [top, setTop] = useState<number>();

  useEffect(() => {
    const bounds = document.querySelector('#viewport-bounds');
    if (!bounds) return;

    return observeTop(bounds, setTop);
  }, []);

  return top;
}
