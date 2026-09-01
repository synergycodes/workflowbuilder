import { render, screen } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import { LabelEdge } from './label-edge';

const { nodeLookup } = vi.hoisted(() => ({ nodeLookup: new Map<string, unknown>() }));

vi.mock('@xyflow/react', () => ({
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
  it('uses the measured source height for self-loop geometry and label placement', () => {
    nodeLookup.set('node-1', { measured: { height: 80 } });

    const { container } = render(<LabelEdge {...selfConnectingEdgeProps} />);

    expect(container.querySelector('[data-edge-id="self-loop"]')?.getAttribute('d')).toContain('Q 125 120 109 120');
    expect(screen.getByTestId('edge-label').dataset.labelY).toBe('120');
  });

  it('falls back to the explicit node height when no measurement exists', () => {
    nodeLookup.set('node-1', { height: 40 });

    render(<LabelEdge {...selfConnectingEdgeProps} />);

    expect(screen.getByTestId('edge-label').dataset.labelY).toBe('160');
  });

  it('treats an unknown source node as zero height', () => {
    render(<LabelEdge {...selfConnectingEdgeProps} />);

    expect(screen.getByTestId('edge-label').dataset.labelY).toBe('200');
  });
});
