// Pins the prop-precedence contract that `reactFlowProps` is sold on
// (README "Advanced: ReactFlow props"): the consumer escape hatch can override
// SDK *defaults*, but never the props the SDK *owns*. The guarantee lives in
// the spread order in `diagram.tsx` (`{...defaults} {...consumer} {...owned}`),
// so this test renders the canvas with a `ReactFlow` capture stub and inspects
// the props it actually receives. A reorder of those spreads, or an owned prop
// leaking into the consumer set, fails here.
//
// The node/edge type maps, palette drop, delete modal and temporary edge are
// stubbed: they pull the overflow-ui + xyflow rendering stack (CSS side
// effects) and are irrelevant to the spread contract.
import { render } from '@testing-library/react';
import { ReactFlow } from '@xyflow/react';
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
  // Capture stub: the test only inspects the props ReactFlow receives, so it
  // renders nothing.
  ReactFlow: vi.fn(() => null),
  Background: () => null,
  SelectionMode: { Partial: 'partial' },
  useUpdateNodeInternals: () => updateNodeInternals,
}));

vi.mock('./hooks/use-node-types', () => ({ useNodeTypes: () => ({}) }));
vi.mock('./hooks/use-edge-types', () => ({ useEdgeTypes: () => ({}) }));
vi.mock('./edges/temporary-edge/temporary-edge', () => ({ TemporaryEdge: () => null }));
vi.mock('../../hooks/use-palette-drop', () => ({ usePaletteDrop: () => ({ onDropFromPalette: vi.fn() }) }));
vi.mock('../modals/delete-confirmation/use-delete-confirmation', () => ({
  useDeleteConfirmation: () => ({ openDeleteConfirmationModal: vi.fn() }),
}));

function makeNode(id: string): WorkflowBuilderNode {
  return { id, position: { x: 0, y: 0 }, type: 'action', data: { type: 'action', icon: 'Plus', properties: {} } };
}

// Unique reference smuggled in via `reactFlowProps` under every SDK-owned key.
// The SDK must overwrite each one, so this reference must never survive to
// ReactFlow.
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
    // Cast: these keys are omitted from the public type, so only a JS / `as`
    // consumer could reach them. The runtime spread order must still win.
    setReactFlowProps({
      nodes: [makeNode('hijack-a'), makeNode('hijack-b')],
      nodesConnectable: false,
      onConnect: consumerOnConnect,
    } as unknown as WorkflowBuilderReactFlowProps);

    render(<DiagramContainer />);
    const props = capturedFlowProps();

    expect(props.nodes).toHaveLength(1);
    expect(props.nodes[0].id).toBe('real');
    // Store is editable on a fresh reset, so the SDK value wins over the
    // consumer's `false`.
    expect(props.nodesConnectable).toBe(true);
    expect(props.onConnect).not.toBe(consumerOnConnect);
  });

  it('keeps the SDK-owned isValidConnection slot even when the consumer sets one via reactFlowProps', () => {
    const consumerIsValid = vi.fn().mockReturnValue(false);
    setReactFlowProps({ isValidConnection: consumerIsValid } as unknown as WorkflowBuilderReactFlowProps);

    render(<DiagramContainer />);
    const props = capturedFlowProps();

    // No Root-level `isValidConnection` set, so the owned slot resolves to
    // `undefined` (ReactFlow default). The consumer's smuggled callback never wins.
    expect(props.isValidConnection).toBeUndefined();
    expect(consumerIsValid).not.toHaveBeenCalled();
  });

  it('sets every SDK-managed prop as an owned attribute below the spreads', () => {
    // Exhaustive over `SdkManagedReactFlowKey`: adding a key to that union forces
    // a new entry here (the `Record` literal stops compiling otherwise), and this
    // test then proves `diagram.tsx` actually sets it after the consumer spread.
    // A managed key missing from the owned JSX block, or moved above the spread,
    // lets the sentinel survive and fails here. Covers every key, not just the
    // representative handful asserted above.
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
