import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { CSSProperties } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import type { WorkflowBuilderDecoratorWrapperProps } from '../../../plugins-core/adapters/adapter-components';
import type { EdgePathProps } from './edge-path';

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  BaseEdge: ({ path, style, ...rest }: { path: string; style?: CSSProperties }) => (
    <path
      d={path}
      data-stroke={style?.stroke}
      data-stroke-dasharray={style?.strokeDasharray}
      data-stroke-width={style?.strokeWidth}
      {...rest}
    />
  ),
}));

const pathProps: EdgePathProps = {
  edgeId: 'edge-1',
  source: 'node-a',
  target: 'node-b',
  path: 'M 0 0 L 100 0',
  state: 'selected',
};

// The decorator registry is module state: a fresh module graph per test keeps registrations from leaking.
async function load() {
  vi.resetModules();
  const { registerComponentDecorator } = await import('../../../plugins-core/adapters/adapter-components');
  const { OptionalEdgePath } = await import('../../../plugins-core/components/diagram/optional-edge-path');

  return { registerComponentDecorator, OptionalEdgePath };
}

function visiblePath(container: HTMLElement) {
  return container.querySelector<SVGPathElement>('[data-edge-id="edge-1"]')!;
}

function runPath({ props, component: Path }: WorkflowBuilderDecoratorWrapperProps<EdgePathProps>) {
  return <Path {...props} runState="completed" lineType="dashed" />;
}

describe('OptionalEdgePath', () => {
  beforeAll(load, 60_000);

  it('draws the edit look without a decorator', async () => {
    const { OptionalEdgePath } = await load();

    const { container } = render(
      <svg>
        <OptionalEdgePath {...pathProps} />
      </svg>,
    );

    const visible = visiblePath(container);
    expect(visible.dataset.stroke).toBe('var(--wb-public-edge-color-select)');
    expect(visible.dataset.strokeDasharray).toBeUndefined();
    expect(Object.hasOwn(visible.dataset, 'runState')).toBe(false);
  });

  it('a wrapper decorator sets the run state and line type on the visible path', async () => {
    const { registerComponentDecorator, OptionalEdgePath } = await load();
    registerComponentDecorator<EdgePathProps>('OptionalEdgePath', {
      place: 'wrapper',
      name: 'run-path',
      content: runPath,
    });

    const { container } = render(
      <svg>
        <OptionalEdgePath {...pathProps} />
      </svg>,
    );

    const visible = visiblePath(container);
    expect(visible.dataset.stroke).toBe('var(--wb-public-edge-color-completed)');
    expect(visible.dataset.strokeDasharray).toBe('var(--wb-public-edge-dash-dashed)');
    expect(visible.dataset.runState).toBe('completed');
    expect(visible.getAttribute('d')).toBe('M 0 0 L 100 0');
  });

  it('draws no terminator unless the app asks for one', async () => {
    const { OptionalEdgePath } = await load();

    const { container } = render(
      <svg>
        <OptionalEdgePath {...pathProps} />
      </svg>,
    );

    expect(container.querySelector('marker')).toBeNull();
    expect(visiblePath(container).hasAttribute('marker-end')).toBe(false);
  });

  it('takes the terminator of the Root, unless the edge sets its own', async () => {
    const { OptionalEdgePath } = await load();
    const { EdgeEndpointContext } = await import('../edge-endpoint-context');

    const { container } = render(
      <EdgeEndpointContext.Provider value="arrow">
        <svg>
          <OptionalEdgePath {...pathProps} />
          <OptionalEdgePath {...pathProps} edgeId="edge-2" endpoint="none" />
        </svg>
      </EdgeEndpointContext.Provider>,
    );

    const marker = container.querySelector('marker polyline')!.parentElement!;
    expect(container.querySelectorAll('marker')).toHaveLength(1);
    expect(visiblePath(container).getAttribute('marker-end')).toBe(`url(#${marker.id})`);
    expect(container.querySelector('[data-edge-id="edge-2"]')!.hasAttribute('marker-end')).toBe(false);
  });

  it('a wrapper decorator ends the path in a terminator of the state colour', async () => {
    const { registerComponentDecorator, OptionalEdgePath } = await load();
    registerComponentDecorator<EdgePathProps>('OptionalEdgePath', {
      place: 'wrapper',
      name: 'endpoint-path',
      content: ({ props, component: Path }: WorkflowBuilderDecoratorWrapperProps<EdgePathProps>) => (
        <Path {...props} endpoint={props.edgeId === 'edge-1' ? 'arrow' : 'circle'} />
      ),
    });

    const { container } = render(
      <svg>
        <OptionalEdgePath {...pathProps} />
        <OptionalEdgePath {...pathProps} edgeId="edge-2" />
      </svg>,
    );

    const arrow = container.querySelector('marker polyline')!.parentElement!;
    const circle = container.querySelector('marker circle')!.parentElement!;
    expect(visiblePath(container).getAttribute('marker-end')).toBe(`url(#${arrow.id})`);
    expect(container.querySelector('[data-edge-id="edge-2"]')!.getAttribute('marker-end')).toBe(`url(#${circle.id})`);
    expect(arrow.querySelector('polyline')!.style.stroke).toBe('var(--wb-public-edge-color-select)');
  });

  it('a wrapper decorator that returns children keeps the edit look', async () => {
    const { registerComponentDecorator, OptionalEdgePath } = await load();
    registerComponentDecorator<EdgePathProps>('OptionalEdgePath', {
      place: 'wrapper',
      name: 'idle-path',
      content: ({ children }: WorkflowBuilderDecoratorWrapperProps<EdgePathProps>) => children,
    });

    const { container } = render(
      <svg>
        <OptionalEdgePath {...pathProps} />
      </svg>,
    );

    expect(visiblePath(container).dataset.stroke).toBe('var(--wb-public-edge-color-select)');
    expect(Object.hasOwn(visiblePath(container).dataset, 'runState')).toBe(false);
  });

  it('before and after decorators leave the path unchanged', async () => {
    const { registerComponentDecorator, OptionalEdgePath } = await load();
    registerComponentDecorator('OptionalEdgePath', {
      place: 'before',
      name: 'path-before',
      content: () => <g data-testid="path-before" />,
    });
    registerComponentDecorator('OptionalEdgePath', {
      place: 'after',
      name: 'path-after',
      content: () => <g data-testid="path-after" />,
    });

    const { container } = render(
      <svg>
        <OptionalEdgePath {...pathProps} />
      </svg>,
    );

    expect(screen.getByTestId('path-before')).toBeTruthy();
    expect(screen.getByTestId('path-after')).toBeTruthy();
    expect(visiblePath(container).dataset.stroke).toBe('var(--wb-public-edge-color-select)');
    expect(Object.hasOwn(visiblePath(container).dataset, 'runState')).toBe(false);
  });

  // The first store import transforms its whole graph, which can outlast the default test timeout.
  it('a run state leaves the edges in the store untouched', async () => {
    const { registerComponentDecorator, OptionalEdgePath } = await load();
    const { useStore } = await import('../../../../store/store');
    const edges = [{ id: 'edge-1', source: 'node-a', target: 'node-b' }] as WorkflowBuilderEdge[];
    useStore.setState({ edges });
    registerComponentDecorator<EdgePathProps>('OptionalEdgePath', {
      place: 'wrapper',
      name: 'run-path',
      content: runPath,
    });

    render(
      <svg>
        <OptionalEdgePath {...pathProps} />
      </svg>,
    );

    expect(useStore.getState().edges).toBe(edges);
    expect(edges).toEqual([{ id: 'edge-1', source: 'node-a', target: 'node-b' }]);
  }, 60_000);

  it.each(['edge-path.tsx', '../../../plugins-core/components/diagram/optional-edge-path.tsx'])(
    '%s does not import the store',
    (file) => {
      const source = readFileSync(path.join(import.meta.dirname, file), 'utf8');

      expect(source).not.toMatch(/from '[^']*\/store(\/[^']*)?'/);
    },
  );
});
