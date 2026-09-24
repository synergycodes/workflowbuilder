import { render } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import { SelfConnectingEdge } from './self-connecting-edge';

const { nodeLookup } = vi.hoisted(() => ({ nodeLookup: new Map<string, unknown>() }));

vi.mock('@xyflow/react', () => ({
  useStore: (selector: (state: { nodeLookup: Map<string, unknown> }) => unknown) => selector({ nodeLookup }),
}));

vi.mock('@workflowbuilder/ui', () => ({
  useEdgeStyle: () => ({}),
}));

vi.mock('../enhanced-base-edge/enhanced-base-edge', () => ({
  EnhancedBaseEdge: ({ id, path }: { id: string; path: string }) => (
    <svg>
      <path data-edge-id={id} d={path} />
    </svg>
  ),
}));

const loopProps = {
  id: 'self-loop',
  source: 'node-1',
  target: 'node-1',
  sourceX: 100,
  sourceY: 300,
  targetX: 200,
  targetY: 300,
  hovered: false,
} as unknown as EdgeProps<WorkflowBuilderEdge> & { hovered: boolean };

function loopApexY(container: HTMLElement) {
  const d = container.querySelector('[data-edge-id="self-loop"]')?.getAttribute('d') ?? '';
  return Math.min(...[...d.matchAll(/L \d+ (\d+)/g)].map((match) => Number(match[1])));
}

beforeEach(() => {
  nodeLookup.clear();
});

function placeNode(top: number) {
  nodeLookup.set('node-1', { internals: { positionAbsolute: { y: top } } });
}

describe('SelfConnectingEdge', () => {
  it('peaks a fixed offset above the node top edge, whatever the node height', () => {
    placeNode(268);

    const { container } = render(<SelfConnectingEdge {...loopProps} />);

    expect(loopApexY(container)).toBe(268 - 48);
  });

  it('keeps that offset for a tall node whose port sits far below the top edge', () => {
    placeNode(78);

    const { container } = render(<SelfConnectingEdge {...loopProps} />);

    expect(loopApexY(container)).toBe(78 - 48);
  });

  it('falls back to the port position for a node React Flow has not placed yet', () => {
    const { container } = render(<SelfConnectingEdge {...loopProps} />);

    expect(loopApexY(container)).toBe(300 - 48);
  });

  it('does not read the node lookup for a regular edge', () => {
    const get = vi.spyOn(nodeLookup, 'get');

    render(<SelfConnectingEdge {...loopProps} target="node-2" />);

    expect(get).not.toHaveBeenCalled();
  });
});
