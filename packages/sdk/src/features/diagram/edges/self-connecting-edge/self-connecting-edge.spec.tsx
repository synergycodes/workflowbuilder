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

describe('SelfConnectingEdge', () => {
  it('reads the measured source height when nodeHeight is omitted', () => {
    nodeLookup.set('node-1', { measured: { height: 80 } });

    const { container } = render(<SelfConnectingEdge {...loopProps} />);

    expect(loopApexY(container)).toBe(300 - (80 + 100));
  });

  it('prefers an explicit nodeHeight over the store', () => {
    nodeLookup.set('node-1', { measured: { height: 80 } });

    const { container } = render(<SelfConnectingEdge {...loopProps} nodeHeight={20} />);

    expect(loopApexY(container)).toBe(300 - (20 + 100));
  });
});
