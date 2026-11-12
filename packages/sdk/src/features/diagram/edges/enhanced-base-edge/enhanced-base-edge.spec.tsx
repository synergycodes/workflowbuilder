import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { EnhancedBaseEdge } from './enhanced-base-edge';

vi.mock('@xyflow/react', () => ({
  BaseEdge: ({ path, ...rest }: { path: string }) => <path d={path} {...rest} />,
}));

function cssRule(selector: string) {
  const stylesheet = readFileSync(path.join(import.meta.dirname, 'enhanced-base-edge.module.css'), 'utf8');
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

  it('sizes the transparent hit area with the public hit width, 12 by default', () => {
    expect(cssRule(':root')).toMatch(/--wb-public-edge-hit-width:\s*12;/);
    expect(cssRule(String.raw`\.clickable-transparent-border`)).toMatch(/stroke-width:\s*var\(--wb-public-edge-hit-width\);/);
    expect(cssRule(String.raw`\.clickable-transparent-border`)).toMatch(/stroke:\s*transparent;/);
  });
});
