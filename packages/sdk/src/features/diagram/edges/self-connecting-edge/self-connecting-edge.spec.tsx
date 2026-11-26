import { render } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import {
  type WorkflowBuilderDecoratorWrapperProps,
  registerComponentDecorator,
} from '../../../plugins-core/adapters/adapter-components';
import type { EdgePathProps } from '../edge-path/edge-path';
import { SelfConnectingEdge } from './self-connecting-edge';

const { nodeLookup } = vi.hoisted(() => ({ nodeLookup: new Map<string, unknown>() }));

vi.mock('@xyflow/react', () => ({
  useStore: (selector: (state: { nodeLookup: Map<string, unknown> }) => unknown) => selector({ nodeLookup }),
  BaseEdge: ({ path, style, ...rest }: { path: string; style?: CSSProperties }) => (
    <path d={path} data-stroke={style?.stroke} data-stroke-dasharray={style?.strokeDasharray} {...rest} />
  ),
}));

type LoopProps = EdgeProps<WorkflowBuilderEdge> & { hovered: boolean; lineType?: 'solid' | 'dashed' };

const loopProps = {
  id: 'self-loop',
  source: 'node-1',
  target: 'node-1',
  sourceX: 100,
  sourceY: 300,
  targetX: 200,
  targetY: 300,
  hovered: false,
} as unknown as LoopProps;

function renderLoop(props: LoopProps) {
  return render(
    <svg>
      <SelfConnectingEdge {...props} />
    </svg>,
  );
}

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

    const { container } = renderLoop(loopProps);

    expect(loopApexY(container)).toBe(268 - 48);
  });

  it('keeps that offset for a tall node whose port sits far below the top edge', () => {
    placeNode(78);

    const { container } = renderLoop(loopProps);

    expect(loopApexY(container)).toBe(78 - 48);
  });

  it('falls back to the port position for a node React Flow has not placed yet', () => {
    const { container } = renderLoop(loopProps);

    expect(loopApexY(container)).toBe(300 - 48);
  });

  it('does not read the node lookup for a regular edge', () => {
    const get = vi.spyOn(nodeLookup, 'get');

    renderLoop({ ...loopProps, target: 'node-2' });

    expect(get).not.toHaveBeenCalled();
  });

  it('draws the loop with the line type of the custom edge that delegates to it', () => {
    const { container } = renderLoop({ ...loopProps, lineType: 'dashed' });

    expect(container.querySelector('[data-edge-id="self-loop"]')?.getAttribute('data-stroke-dasharray')).toBe(
      'var(--wb-public-edge-dash-dashed)',
    );
  });

  it('carries the tone a run-state decorator sets on the loop', () => {
    // The registry is module state: the decorator leaves every other edge id in the edit look.
    registerComponentDecorator<EdgePathProps>('OptionalEdgePath', {
      place: 'wrapper',
      name: 'toned-loop',
      content: ({ props, component: Path, children }: WorkflowBuilderDecoratorWrapperProps<EdgePathProps>) =>
        props.edgeId === 'toned-loop' ? <Path {...props} runState="completed" tone="warning" /> : children,
    });

    const { container } = renderLoop({ ...loopProps, id: 'toned-loop' });

    const loop = container.querySelector<SVGPathElement>('[data-edge-id="toned-loop"]')!;
    expect(loop.dataset.runState).toBe('completed');
    expect(loop.dataset.stroke).toBe(
      'var(--wb-public-edge-run-status-stroke-warning, var(--wb-public-edge-run-status-stroke-success))',
    );
  });
});
