// Pins the read-only guard contract for `useConnect` (WB-339): in read-only mode
// the connection handlers must be inert and warn the user; in editable mode they
// must forward to the store and track the change.
//
// `@synergycodes/overflow-ui` is mocked because the hook imports `SnackbarType`
// from it, and the package's JS carries a CSS side-effect import vitest's
// node-side transformer can't process. `show-snackbar` is mocked so the user
// feedback can be asserted without rendering the snackbar stack.
import { renderHook } from '@testing-library/react';
import type { Connection } from '@xyflow/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetWorkflowStore, useStore } from '../../../store/store';
import { useConnect } from './use-on-connect';

vi.mock('@synergycodes/overflow-ui', () => ({
  SnackbarType: { SUCCESS: 'success', WARNING: 'warning', ERROR: 'error', INFO: 'info' },
}));

const { showSnackbar } = vi.hoisted(() => ({ showSnackbar: vi.fn() }));
vi.mock('../../../utils/show-snackbar', () => ({ showSnackbar }));

const { trackFutureChange } = vi.hoisted(() => ({ trackFutureChange: vi.fn() }));
vi.mock('../../../features/changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange,
}));

const CONNECTION: Connection = { source: 'a', target: 'b', sourceHandle: null, targetHandle: null };

beforeEach(() => {
  resetWorkflowStore();
  showSnackbar.mockClear();
  trackFutureChange.mockClear();
});

describe('useConnect — read-only mode', () => {
  beforeEach(() => {
    useStore.setState({ isReadOnlyMode: true });
  });

  it('onConnect makes no store mutation and warns the user', () => {
    const onConnectAction = vi.fn();
    useStore.setState({ onConnect: onConnectAction });

    const { result } = renderHook(() => useConnect());
    result.current.onConnect(CONNECTION);

    expect(onConnectAction).not.toHaveBeenCalled();
    expect(trackFutureChange).not.toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith({ title: 'cantEditReadOnlyMode', variant: 'warning' });
  });

  it('onConnectStart does not flag a connection as being dragged', () => {
    const setConnectionBeingDragged = vi.fn();
    useStore.setState({ setConnectionBeingDragged });

    const { result } = renderHook(() => useConnect());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current.onConnectStart({} as any, { nodeId: 'n1', handleId: 'h1', handleType: 'source' });

    expect(setConnectionBeingDragged).not.toHaveBeenCalled();
  });

  it('onConnectEnd does not clear the dragged connection', () => {
    const setConnectionBeingDragged = vi.fn();
    useStore.setState({ setConnectionBeingDragged });

    const { result } = renderHook(() => useConnect());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current.onConnectEnd({} as any, {} as any);

    expect(setConnectionBeingDragged).not.toHaveBeenCalled();
  });
});

describe('useConnect — editable mode', () => {
  it('onConnect tracks the change and forwards to the store action', () => {
    const onConnectAction = vi.fn();
    useStore.setState({ onConnect: onConnectAction });

    const { result } = renderHook(() => useConnect());
    result.current.onConnect(CONNECTION);

    expect(trackFutureChange).toHaveBeenCalledWith('addEdge');
    expect(onConnectAction).toHaveBeenCalledWith(CONNECTION);
    expect(showSnackbar).not.toHaveBeenCalled();
  });

  it('onConnectStart flags the originating node and handle as being dragged', () => {
    const setConnectionBeingDragged = vi.fn();
    useStore.setState({ setConnectionBeingDragged });

    const { result } = renderHook(() => useConnect());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current.onConnectStart({} as any, { nodeId: 'n1', handleId: 'h1', handleType: 'source' });

    expect(setConnectionBeingDragged).toHaveBeenCalledWith('n1', 'h1');
  });

  it('onConnectEnd clears the dragged connection', () => {
    const setConnectionBeingDragged = vi.fn();
    useStore.setState({ setConnectionBeingDragged });

    const { result } = renderHook(() => useConnect());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current.onConnectEnd({} as any, {} as any);

    expect(setConnectionBeingDragged).toHaveBeenCalledWith(null, null);
  });
});
