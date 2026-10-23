import { render } from '@testing-library/react';
import { act, useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnSave } from '../../../../../types/integration';
import { trackFutureChange } from '../../../../changes-tracker/stores/use-changes-tracker-store';
import { getStoreSavingStatus, setStoreSavingStatus } from '../../../stores/use-integration-store';
import { showSnackbarSaveErrorIfNeeded } from '../../../utils/show-snackbar';
import { IntegrationContext, IntegrationContextWrapper } from './integration-context-wrapper';

vi.mock('@/features/integration/stores/use-integration-store', () => ({
  getStoreSavingStatus: vi.fn(),
  setStoreSavingStatus: vi.fn(),
}));

vi.mock('@/features/integration/utils/show-snackbar', () => ({
  showSnackbarSaveErrorIfNeeded: vi.fn(),
}));

vi.mock('@/features/changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

function renderAndGetOnSave(mockOnSave: OnSave): OnSave {
  let capturedOnSave!: OnSave;

  function Consumer() {
    capturedOnSave = useContext(IntegrationContext).onSave;
    return null;
  }

  render(
    <IntegrationContextWrapper onSave={mockOnSave}>
      <Consumer />
    </IntegrationContextWrapper>,
  );

  return capturedOnSave;
}

describe('IntegrationContextWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoreSavingStatus).mockReturnValue('waiting');
  });

  it('returns error without calling onSave while the initial load has not finished', async () => {
    vi.mocked(getStoreSavingStatus).mockReturnValue('disabled');
    const mockOnSave = vi.fn();
    const onSave = renderAndGetOnSave(mockOnSave);

    const result = await act(() => onSave({ isAutoSave: true }));

    expect(result).toBe('error');
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(vi.mocked(setStoreSavingStatus)).not.toHaveBeenCalled();
  });

  it.each([
    ['an auto-save', { isAutoSave: true }],
    ['a manual save', { isAutoSave: false }],
  ])('after a failed load refuses %s without calling onSave and reports it like a failed save', async (_, params) => {
    vi.mocked(getStoreSavingStatus).mockReturnValue('loadFailed');
    const mockOnSave = vi.fn();
    const onSave = renderAndGetOnSave(mockOnSave);

    const result = await act(() => onSave(params));

    expect(result).toBe('error');
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(vi.mocked(setStoreSavingStatus)).not.toHaveBeenCalled();
    expect(vi.mocked(showSnackbarSaveErrorIfNeeded)).toHaveBeenCalledWith(params);
  });

  it('a save kept from an unmounted wrapper resolves error without calling onSave', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('success');
    let onSave!: OnSave;
    function Consumer() {
      onSave = useContext(IntegrationContext).onSave;
      return null;
    }
    const view = render(
      <IntegrationContextWrapper onSave={mockOnSave}>
        <Consumer />
      </IntegrationContextWrapper>,
    );

    view.unmount();
    const result = await act(() => onSave());

    expect(result).toBe('error');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('a save that settles after the wrapper unmounted leaves the saving status of the next mount alone', async () => {
    let settle!: (status: 'success') => void;
    const mockOnSave = vi.fn(() => new Promise<'success'>((resolve) => (settle = resolve)));
    let onSave!: OnSave;
    function Consumer() {
      onSave = useContext(IntegrationContext).onSave;
      return null;
    }
    const view = render(
      <IntegrationContextWrapper onSave={mockOnSave}>
        <Consumer />
      </IntegrationContextWrapper>,
    );
    const pending = onSave();

    view.unmount();
    settle('success');

    expect(await pending).toBe('success');
    expect(vi.mocked(setStoreSavingStatus).mock.calls).toEqual([['saving']]);
    expect(vi.mocked(trackFutureChange)).not.toHaveBeenCalled();
  });

  it('returns alreadyStarted without calling onSave when already saving', async () => {
    vi.mocked(getStoreSavingStatus).mockReturnValue('saving');
    const mockOnSave = vi.fn();
    const onSave = renderAndGetOnSave(mockOnSave);

    const result = await act(() => onSave());

    expect(result).toBe('alreadyStarted');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('sets status to saving before calling onSave', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(mockOnSave);

    await act(() => onSave());

    expect(vi.mocked(setStoreSavingStatus).mock.calls[0][0]).toBe('saving');
  });

  it('sets status to saved on successful manual save', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(mockOnSave);

    await act(() => onSave());

    expect(vi.mocked(setStoreSavingStatus)).toHaveBeenCalledWith('saved');
  });

  it('calls trackFutureChange on manual save success', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(mockOnSave);

    await act(() => onSave());

    expect(vi.mocked(trackFutureChange)).toHaveBeenCalledWith('manualSave');
  });

  it('does not call trackFutureChange on autosave success', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(mockOnSave);

    await act(() => onSave({ isAutoSave: true }));

    expect(vi.mocked(trackFutureChange)).not.toHaveBeenCalled();
  });

  it('sets status to notSaved on failed manual save', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('error');
    const onSave = renderAndGetOnSave(mockOnSave);

    await act(() => onSave());

    expect(vi.mocked(setStoreSavingStatus)).toHaveBeenCalledWith('notSaved');
  });

  it('sets status to waiting on failed autosave', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('error');
    const onSave = renderAndGetOnSave(mockOnSave);

    await act(() => onSave({ isAutoSave: true }));

    expect(vi.mocked(setStoreSavingStatus)).toHaveBeenCalledWith('waiting');
  });

  it('returns the result from the wrapped onSave', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(mockOnSave);

    const result = await act(() => onSave());

    expect(result).toBe('success');
  });

  it('passes savingParams through to the wrapped onSave', async () => {
    const mockOnSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(mockOnSave);

    await act(() => onSave({ isAutoSave: true }));

    expect(mockOnSave).toHaveBeenCalledWith({ isAutoSave: true });
  });

  it('provides onSave through context to consumers', () => {
    let contextOnSave!: OnSave;

    function Consumer() {
      contextOnSave = useContext(IntegrationContext).onSave;
      return null;
    }

    const mockOnSave = vi.fn().mockResolvedValue('success');
    render(
      <IntegrationContextWrapper onSave={mockOnSave}>
        <Consumer />
      </IntegrationContextWrapper>,
    );

    expect(contextOnSave).toBeTypeOf('function');
  });
});
