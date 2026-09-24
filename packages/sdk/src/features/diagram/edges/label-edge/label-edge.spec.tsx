import { render, screen } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import { LabelEdge } from './label-edge';

const { nodeLookup } = vi.hoisted(() => ({ nodeLookup: new Map<string, unknown>() }));

vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
  getSmoothStepPath: () => ['M 0 0', 0, 0],
  useStore: (selector: (state: { nodeLookup: Map<string, unknown> }) => unknown) => selector({ nodeLookup }),
}));

vi.mock('../edge-label-renderer/edge-label-renderer', () => ({
  EdgeLabel: ({ id, labelY }: { id: string; labelY: number }) => (
    <span data-testid="edge-label" data-edge-label-id={id} data-label-y={labelY} />
  ),
}));

vi.mock('../enhanced-base-edge/enhanced-base-edge', () => ({
  EnhancedBaseEdge: ({ id, path }: { id: string; path: string }) => (
    <svg>
      <path data-edge-id={id} d={path} />
    </svg>
  ),
}));

vi.mock('./use-label-edge-hover', () => ({
  useLabelEdgeHover: () => ({
    style: {},
    hovered: false,
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
  }),
}));

const selfConnectingEdgeProps = {
  id: 'self-loop',
  source: 'node-1',
  target: 'node-1',
  sourceX: 100,
  sourceY: 300,
  targetX: 200,
  targetY: 300,
  sourcePosition: 'right',
  targetPosition: 'left',
  data: { label: 'Loop' },
} as EdgeProps<WorkflowBuilderEdge>;

beforeEach(() => {
  nodeLookup.clear();
});

describe('LabelEdge', () => {
  it('puts the label on the loop apex, a fixed offset above the node top edge', () => {
    nodeLookup.set('node-1', { internals: { positionAbsolute: { y: 268 } } });

    const { container } = render(<LabelEdge {...selfConnectingEdgeProps} />);

    expect(container.querySelector('[data-edge-id="self-loop"]')?.getAttribute('d')).toContain('220');
    expect(screen.getByTestId('edge-label').dataset.labelY).toBe('220');
  });

  it('keeps label and loop together on a tall node', () => {
    nodeLookup.set('node-1', { internals: { positionAbsolute: { y: 78 } } });

    render(<LabelEdge {...selfConnectingEdgeProps} />);

    expect(screen.getByTestId('edge-label').dataset.labelY).toBe('30');
  });

  it('does not read the node lookup for a regular edge', () => {
    const get = vi.spyOn(nodeLookup, 'get');

    render(<LabelEdge {...selfConnectingEdgeProps} target="node-2" />);

    expect(get).not.toHaveBeenCalled();
    expect(screen.getByTestId('edge-label').dataset.labelY).toBe('0');
  });

  it('falls back to the port position for a node React Flow has not placed yet', () => {
    render(<LabelEdge {...selfConnectingEdgeProps} />);

    expect(screen.getByTestId('edge-label').dataset.labelY).toBe('252');
  });
});
