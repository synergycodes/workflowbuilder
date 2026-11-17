// Pins the `reactFlowProps` precedence contract: a consumer can override SDK
// *defaults* but never the props the SDK *owns* (spread order in `diagram.tsx`),
// and the canvas `Background` colours. Renders with a `ReactFlow` capture stub.
// The rendering-stack deps below are stubbed (CSS side effects, irrelevant here).
import { render } from '@testing-library/react';
import { Background, ReactFlow } from '@xyflow/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setIsValidConnection, setReactFlowProps } from '../../data/react-flow-config';
import type { WorkflowBuilderNode } from '../../node/node-data';
import { resetWorkflowStore, useStore } from '../../store/store';
import type {
  SdkManagedReactFlowKey,
  WorkflowBuilderReactFlowProps,
} from '../../workflow-builder-root/workflow-builder-root.types';
import { DiagramContainer } from './diagram';

const { updateNodeInternals } = vi.hoisted(() => ({ updateNodeInternals: vi.fn() }));

vi.mock('@xyflow/react', () => ({
  // Capture stub: only the received props matter, so it renders nothing.
  ReactFlow: vi.fn(() => null),
  Background: () => null,
  SelectionMode: { Partial: 'partial' },
  useUpdateNodeInternals: () => updateNodeInternals,
}));

vi.mock('./hooks/use-node-types', () => ({ useNodeTypes: () => ({}) }));
vi.mock('./hooks/use-edge-types', () => ({ useEdgeTypes: () => ({}) }));
vi.mock('./hooks/use-on-connect', () => ({
  useConnect: () => ({ onConnect: vi.fn(), onConnectStart: vi.fn(), onConnectEnd: vi.fn() }),
}));
vi.mock('./edges/temporary-edge/temporary-edge', () => ({ TemporaryEdge: () => null }));
vi.mock('../../hooks/use-palette-drop', () => ({ usePaletteDrop: () => ({ onDropFromPalette: vi.fn() }) }));
vi.mock('../modals/delete-confirmation/use-delete-confirmation', () => ({
  useDeleteConfirmation: () => ({ openDeleteConfirmationModal: vi.fn() }),
}));

function makeNode(id: string): WorkflowBuilderNode {
  return { id, position: { x: 0, y: 0 }, type: 'action', data: { type: 'action', icon: 'Plus', properties: {} } };
}

// Smuggled in via `reactFlowProps` under every SDK-owned key. The SDK must
// overwrite each one, so this reference must never reach ReactFlow.
const OWNED_SENTINEL = { __sentinel: true };

/** Props the (mocked) `ReactFlow` received on the latest render. */
function capturedFlowProps() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return vi.mocked(ReactFlow).mock.calls.at(-1)![0] as any;
}

beforeEach(() => {
  resetWorkflowStore();
  setIsValidConnection(null);
  setReactFlowProps(null);
  vi.mocked(ReactFlow).mockClear();
});

describe('DiagramContainer — reactFlowProps precedence', () => {
  it('lets the consumer override SDK defaults', () => {
    setReactFlowProps({ minZoom: 0.5, panOnScroll: false, zoomOnDoubleClick: false });

    render(<DiagramContainer />);
    const props = capturedFlowProps();

    expect(props.minZoom).toBe(0.5);
    expect(props.panOnScroll).toBe(false);
    expect(props.zoomOnDoubleClick).toBe(false);
    // A default the consumer did not touch is untouched.
    expect(props.selectionMode).toBe('partial');
  });

  it('never lets reactFlowProps override SDK-owned props', () => {
    useStore.setState({ nodes: [makeNode('real')] });
    const consumerOnConnect = vi.fn();
    // Cast past the public type (a JS consumer could reach these); the spread
    // order must still win.
    setReactFlowProps({
      nodes: [makeNode('hijack-a'), makeNode('hijack-b')],
      nodesConnectable: false,
      onConnect: consumerOnConnect,
    } as unknown as WorkflowBuilderReactFlowProps);

    render(<DiagramContainer />);
    const props = capturedFlowProps();

    expect(props.nodes).toHaveLength(1);
    expect(props.nodes[0].id).toBe('real');
    // Editable store on fresh reset, so the SDK's `true` wins over `false`.
    expect(props.nodesConnectable).toBe(true);
    expect(props.onConnect).not.toBe(consumerOnConnect);
  });

  it('keeps the SDK-owned isValidConnection slot even when the consumer sets one via reactFlowProps', () => {
    const consumerIsValid = vi.fn().mockReturnValue(false);
    setReactFlowProps({ isValidConnection: consumerIsValid } as unknown as WorkflowBuilderReactFlowProps);

    render(<DiagramContainer />);
    const props = capturedFlowProps();

    // No Root-level callback, so the owned slot is `undefined`; the smuggled one never wins.
    expect(props.isValidConnection).toBeUndefined();
    expect(consumerIsValid).not.toHaveBeenCalled();
  });

  it('sets every SDK-managed prop as an owned attribute below the spreads', () => {
    // Exhaustive over `SdkManagedReactFlowKey`: a new key forces an entry here
    // (the `Record` won't compile otherwise), proving `diagram.tsx` sets it after
    // the consumer spread. A managed key above the spread lets the sentinel survive.
    const sentinels: Record<SdkManagedReactFlowKey, unknown> = {
      nodes: OWNED_SENTINEL,
      edges: OWNED_SENTINEL,
      nodeTypes: OWNED_SENTINEL,
      edgeTypes: OWNED_SENTINEL,
      onConnect: OWNED_SENTINEL,
      onConnectStart: OWNED_SENTINEL,
      onConnectEnd: OWNED_SENTINEL,
      onNodesChange: OWNED_SENTINEL,
      onEdgesChange: OWNED_SENTINEL,
      onSelectionChange: OWNED_SENTINEL,
      onInit: OWNED_SENTINEL,
      onBeforeDelete: OWNED_SENTINEL,
      onNodeDragStart: OWNED_SENTINEL,
      onNodeDragStop: OWNED_SENTINEL,
      onEdgeMouseEnter: OWNED_SENTINEL,
      onEdgeMouseLeave: OWNED_SENTINEL,
      onDragOver: OWNED_SENTINEL,
      onDrop: OWNED_SENTINEL,
      connectionLineComponent: OWNED_SENTINEL,
      nodesConnectable: OWNED_SENTINEL,
      nodesDraggable: OWNED_SENTINEL,
      isValidConnection: OWNED_SENTINEL,
    };

    setReactFlowProps(sentinels as unknown as WorkflowBuilderReactFlowProps);
    render(<DiagramContainer />);
    const props = capturedFlowProps();

    for (const key of Object.keys(sentinels)) {
      expect(props[key], `${key} must be set by the SDK, not by reactFlowProps`).not.toBe(OWNED_SENTINEL);
    }
  });
});

describe('DiagramContainer — canvas background', () => {
  it('paints the dot grid with the public grid colour variable', () => {
    render(<DiagramContainer />);

    const background = capturedFlowProps().children;

    expect(background.type).toBe(Background);
    expect(background.props).toMatchObject({
      color: 'var(--wb-public-canvas-grid-color)',
      bgColor: 'var(--wb-public-background-color)',
    });
  });

  // Vitest stubs CSS, so the default is read from disk.
  it('defaults the grid colour to the design system canvas dots', () => {
    const css = readFileSync(path.join(import.meta.dirname, '../../index.css'), 'utf8');

    expect(css).toMatch(/:root\s*\{[^}]*--wb-public-canvas-grid-color:\s*var\(--wb-ds-ui-bg-canvas-dots\);/);
  });
});
