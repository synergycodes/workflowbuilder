import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { EnhancedBaseEdge } from './enhanced-base-edge';

vi.mock('@xyflow/react', () => ({
  BaseEdge: ({ path, interactionWidth, ...rest }: { path: string; interactionWidth?: number }) => (
    <path d={path} data-interaction-width={interactionWidth} {...rest} />
  ),
}));

function cssRule(file: string, selector: string) {
  const stylesheet = readFileSync(path.join(import.meta.dirname, file), 'utf8');
  return stylesheet.match(new RegExp(`${selector}\\s*{([^}]*)}`))?.[1] ?? '';
}

describe('EnhancedBaseEdge', () => {
  it('draws the hit area under the visible path and passes data attributes to the visible one', () => {
    const { container } = render(
      <svg>
        <EnhancedBaseEdge id="edge-1" path="M 0 0 L 10 0" data-run-state="running" />
      </svg>,
    );

    const hitArea = container.querySelector<SVGPathElement>('path:nth-of-type(1)');
    const visible = container.querySelector<SVGPathElement>('path:nth-of-type(2)');
    expect(hitArea!.dataset.pathBorderFor).toBe('edge-1');
    expect(hitArea!.getAttribute('class')).toContain('clickable-transparent-border');
    expect(Object.hasOwn(hitArea!.dataset, 'runState')).toBe(false);
    expect(visible!.dataset.edgeId).toBe('edge-1');
    expect(visible!.dataset.runState).toBe('running');
    expect(container.querySelector('svg')!.textContent).toBe('');
  });

  it('turns off the xyflow interaction path on both paths', () => {
    const { container } = render(
      <svg>
        <EnhancedBaseEdge id="edge-1" path="M 0 0 L 10 0" />
      </svg>,
    );

    const widths = Array.from(container.querySelectorAll('path'), (element) => element.dataset.interactionWidth);
    expect(widths).toEqual(['0', '0']);
  });

  it('draws no terminator unless asked, so it stays a drop-in BaseEdge', () => {
    const { container } = render(
      <svg>
        <EnhancedBaseEdge id="edge-1" path="M 0 0 L 10 0" markerEnd="url(#host-marker)" />
      </svg>,
    );

    expect(container.querySelector('marker')).toBeNull();
    expect(container.querySelector('[data-edge-id="edge-1"]')!.getAttribute('marker-end')).toBe('url(#host-marker)');
  });

  it('ends only the visible path with its own marker, in the colour of the path', () => {
    const style = { stroke: 'var(--wb-public-edge-color-select)', strokeDasharray: '5 4' };
    const { container } = render(
      <svg>
        <EnhancedBaseEdge
          id="edge-1"
          path="M 0 0 L 10 0"
          style={style}
          endpoint="arrow"
          markerEnd="url(#host-marker)"
        />
        <EnhancedBaseEdge id="edge-2" path="M 0 0 L 10 0" style={style} endpoint="circle" />
      </svg>,
    );

    const markers = container.querySelectorAll('marker');
    const arrow = markers[0];
    const circle = markers[1];
    expect(arrow!.id).not.toBe(circle!.id);
    expect(container.querySelector('[data-edge-id="edge-1"]')!.getAttribute('marker-end')).toBe(`url(#${arrow!.id})`);
    expect(container.querySelector('[data-edge-id="edge-2"]')!.getAttribute('marker-end')).toBe(`url(#${circle!.id})`);
    expect(container.querySelector('[data-path-border-for="edge-1"]')!.hasAttribute('marker-end')).toBe(false);
    expect(arrow!.querySelector('polyline')!.style.stroke).toBe(style.stroke);
    expect(arrow!.querySelector('polyline')!.style.strokeDasharray).toBe('');
    expect(circle!.querySelector('circle')!.style.stroke).toBe(style.stroke);
  });

  it('sizes the transparent hit area with the public hit width, 12 by default', () => {
    expect(cssRule('../../../../index.css', ':root')).toMatch(/--wb-public-edge-hit-width:\s*12;/);
    const hitArea = cssRule('enhanced-base-edge.module.css', String.raw`\.clickable-transparent-border`);
    expect(hitArea).toMatch(/stroke-width:\s*var\(--wb-public-edge-hit-width\);/);
    expect(hitArea).toMatch(/stroke:\s*transparent;/);
  });

  it('turns only the edit colours to the select colour on keyboard focus', () => {
    const focus = cssRule('../../diagram.module.css', String.raw`:global\(\.react-flow__edge:focus-visible\)`);

    expect(focus.match(/--wb-public-edge-color[\w-]*(?=:)/g)).toEqual([
      '--wb-public-edge-color',
      '--wb-public-edge-color-hover',
    ]);
    expect(focus.match(/var\(--wb-public-edge-color-select\)/g)).toHaveLength(2);
  });
});
