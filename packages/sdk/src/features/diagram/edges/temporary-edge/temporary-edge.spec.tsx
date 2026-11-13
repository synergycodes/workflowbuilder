import { render } from '@testing-library/react';
import { type ConnectionLineComponentProps, Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { EdgeEndpointContext } from '../edge-endpoint-context';
import { TemporaryEdge } from './temporary-edge';

const line = {
  fromX: 0,
  fromY: 0,
  fromPosition: Position.Right,
  toX: 200,
  toY: 80,
  toPosition: Position.Left,
} as ConnectionLineComponentProps;

describe('TemporaryEdge', () => {
  it('draws no terminator by default', () => {
    const { container } = render(
      <svg>
        <TemporaryEdge {...line} />
      </svg>,
    );

    expect(container.querySelector('marker')).toBeNull();
  });

  it('ends in the terminator of the Root, in its own colour', () => {
    const { container } = render(
      <EdgeEndpointContext.Provider value="arrow">
        <svg>
          <TemporaryEdge {...line} />
        </svg>
      </EdgeEndpointContext.Provider>,
    );

    const marker = container.querySelector('marker')!;
    const markerEnds = Array.from(container.querySelectorAll('path'), (path) => path.getAttribute('marker-end'));
    expect(markerEnds).toContain(`url(#${marker.id})`);
    expect(marker.querySelector('polyline')!.style.stroke).toBe('var(--wb-public-edge-color-select)');
  });
});
