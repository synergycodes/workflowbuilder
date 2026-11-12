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

  // xyflow's interaction path would otherwise catch the pointer 20 px wide whatever the hit width says.
  it('turns off the xyflow interaction path on both paths', () => {
    const { container } = render(
      <svg>
        <EnhancedBaseEdge id="edge-1" path="M 0 0 L 10 0" />
      </svg>,
    );

    const widths = Array.from(container.querySelectorAll('path'), (element) => element.dataset.interactionWidth);
    expect(widths).toEqual(['0', '0']);
  });

  it('sizes the transparent hit area with the public hit width, 12 by default', () => {
    expect(cssRule('../../../../index.css', ':root')).toMatch(/--wb-public-edge-hit-width:\s*12;/);
    const hitArea = cssRule('enhanced-base-edge.module.css', String.raw`\.clickable-transparent-border`);
    expect(hitArea).toMatch(/stroke-width:\s*var\(--wb-public-edge-hit-width\);/);
    expect(hitArea).toMatch(/stroke:\s*transparent;/);
  });

  it('paints keyboard focus in the select colour on SDK-drawn paths without a run state only', () => {
    const focus = readFileSync(path.join(import.meta.dirname, '../../diagram.module.css'), 'utf8').match(
      /:global\(\.react-flow__edge:focus-visible \[data-edge-id\]:not\(\[data-run-state\]\)\)\s*{([^}]*)}/,
    );

    expect(focus?.[1]).toMatch(/stroke:\s*var\(--wb-public-edge-color-select\)\s*!important;/);
  });
});
