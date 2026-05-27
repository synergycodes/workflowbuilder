import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type GetFlowMousePosition, useFlowMousePosition } from './use-flow-mouse-position';

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: (point: { x: number; y: number }) => point,
    setNodes: vi.fn(),
    setEdges: vi.fn(),
  }),
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
}));

// React needs this flag to permit act() outside a dedicated test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // The hook resolves the flow container via `.react-flow`.
  const flow = document.createElement('div');
  flow.className = 'react-flow';
  document.body.append(flow);

  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

function moveMouse(clientX: number, clientY: number) {
  globalThis.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY }));
}

describe('useFlowMousePosition', () => {
  it('does not re-render its host on mousemove', () => {
    let renders = 0;

    function Host() {
      renders += 1;
      useFlowMousePosition();
      return null;
    }

    act(() => root.render(<Host />));
    expect(renders).toBe(1);

    act(() => {
      moveMouse(10, 20);
      moveMouse(30, 40);
      moveMouse(50, 60);
    });

    expect(renders).toBe(1);
  });

  it('reports the latest pointer position on demand', () => {
    let getPosition: GetFlowMousePosition | undefined;

    function Host() {
      getPosition = useFlowMousePosition();
      return null;
    }

    act(() => root.render(<Host />));

    act(() => {
      moveMouse(123, 456);
    });

    expect(getPosition?.().screen).toEqual({ x: 123, y: 456 });
  });
});
