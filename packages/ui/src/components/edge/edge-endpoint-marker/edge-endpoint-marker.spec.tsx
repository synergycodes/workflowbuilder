import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { EdgeEndpointMarker } from './edge-endpoint-marker';

const pathStyle = {
  stroke: 'var(--wb-public-edge-color-running)',
  strokeWidth: 'var(--wb-public-edge-stroke-width)',
  transition: 'stroke var(--wb-public-transition)',
  strokeDasharray: 'var(--wb-public-edge-dash-running)',
  animation: 'var(--wb-public-edge-animation-running)',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderMarker(type: 'arrow' | 'circle') {
  act(() =>
    root.render(
      <svg>
        <EdgeEndpointMarker id="marker-1" type={type} style={pathStyle} />
      </svg>,
    ),
  );
  const marker = container.querySelector('marker')!;

  return { marker, shape: marker.firstElementChild as SVGElement };
}

describe('EdgeEndpointMarker', () => {
  it.each(['arrow', 'circle'] as const)('%s turns with the path and keeps its size at any stroke width', (type) => {
    const { marker } = renderMarker(type);

    expect(marker.id).toBe('marker-1');
    expect(marker.getAttribute('orient')).toBe('auto');
    expect(marker.getAttribute('markerUnits')).toBe('userSpaceOnUse');
  });

  it.each(['arrow', 'circle'] as const)('%s takes the colour and width of the path, not its dash', (type) => {
    const { shape } = renderMarker(type);

    expect(shape.style.stroke).toBe(pathStyle.stroke);
    expect(shape.style.strokeWidth).toBe(pathStyle.strokeWidth);
    expect(shape.style.transition).toBe(pathStyle.transition);
    expect(shape.style.strokeDasharray).toBe('');
    expect(shape.style.animation).toBe('');
  });

  it('draws the arrow as an open chevron whose tip is the end of the path', () => {
    const { marker, shape } = renderMarker('arrow');

    expect(shape.tagName).toBe('polyline');
    expect(shape.getAttribute('fill')).toBe('none');
    expect(shape.getAttribute('points')).toBe('1,1 6.5,6.5 1,12');
    expect([marker.getAttribute('refX'), marker.getAttribute('refY')]).toEqual(['6.5', '6.5']);
  });

  it('draws the circle before the end of the path and hides the line under it', () => {
    const { marker, shape } = renderMarker('circle');

    expect(shape.tagName).toBe('circle');
    expect(shape.style.fill).toBe('var(--wb-public-background-color, var(--wb-ds-ui-bg-canvas))');
    // Outer right edge (cx + r + half the 1 px stroke) on the end of the path.
    expect(Number(marker.getAttribute('refX'))).toBe(4.5 + 3.5 + 0.5);
  });
});
