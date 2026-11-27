import { act, cleanup, render } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnSave, OnSaveExternal } from '../../../types/integration';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../utils/show-snackbar';
import { RuntimeIntegrationWrapper } from './runtime-integration-wrapper';

let save: OnSave;
vi.mock('./integration-variants/wrapper/integration-wrapper', () => ({
  IntegrationWrapper: ({ onSave, children }: PropsWithChildren<{ onSave: OnSave }>) => {
    save = onSave;
    return children;
  },
}));
vi.mock('../../../store/slices/diagram-slice/actions', () => ({
  getStoreDataForIntegration: () => ({ name: 'Flow', nodes: [], edges: [] }),
}));
vi.mock('../utils/show-snackbar', () => ({
  showSnackbarSaveErrorIfNeeded: vi.fn(),
  showSnackbarSaveSuccessIfNeeded: vi.fn(),
}));

function mount(onDataSave: OnSaveExternal, strategy: 'props' | 'localStorage' = 'props') {
  return render(
    <RuntimeIntegrationWrapper strategy={strategy} onDataSave={onDataSave} autoSave={false} onLoad={vi.fn()} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('RuntimeIntegrationWrapper save results', () => {
  it.each([
    { status: 'success' as const, success: 1, error: 0 },
    { status: 'error' as const, success: 0, error: 1 },
    { status: 'alreadyStarted' as const, success: 0, error: 0 },
  ])('preserves $status and emits only its matching feedback', async ({ status, success, error }) => {
    mount(async () => status);
    const result = await act(() => save());
    expect(result).toBe(status);
    expect(showSnackbarSaveSuccessIfNeeded).toHaveBeenCalledTimes(success);
    expect(showSnackbarSaveErrorIfNeeded).toHaveBeenCalledTimes(error);
  });

  it('reports a rejected callback as an error', async () => {
    mount(async () => {
      throw new Error('Refused');
    });
    const result = await act(() => save());
    expect(result).toBe('error');
    expect(showSnackbarSaveSuccessIfNeeded).not.toHaveBeenCalled();
    expect(showSnackbarSaveErrorIfNeeded).toHaveBeenCalledTimes(1);
  });

  it.each(['success', 'error'] as const)('a late %s does not notify the replacement editor', async (status) => {
    let settle!: (value: typeof status) => void;
    const view = mount(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
    );
    const pending = save();
    view.unmount();
    mount(async () => 'success');
    await act(async () => {
      settle(status);
      await pending;
    });
    expect(showSnackbarSaveSuccessIfNeeded).not.toHaveBeenCalled();
    expect(showSnackbarSaveErrorIfNeeded).not.toHaveBeenCalled();
  });

  it('a retained callback cannot save after its wrapper unmounts', async () => {
    const persist = vi.fn<OnSaveExternal>().mockResolvedValue('success');
    const view = mount(persist);
    const retained = save;
    view.unmount();
    const result = await act(() => retained());
    expect(result).toBe('error');
    expect(persist).not.toHaveBeenCalled();
    expect(showSnackbarSaveSuccessIfNeeded).not.toHaveBeenCalled();
    expect(showSnackbarSaveErrorIfNeeded).not.toHaveBeenCalled();
  });

  it('a localStorage completion does not notify after unmount', async () => {
    vi.useFakeTimers();
    const view = mount(async () => 'success', 'localStorage');
    const pending = save();
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
      await pending;
    });
    expect(showSnackbarSaveSuccessIfNeeded).not.toHaveBeenCalled();
  });
});
