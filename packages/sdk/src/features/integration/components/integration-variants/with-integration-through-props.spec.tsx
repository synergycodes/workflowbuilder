import { render } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStoreDataForIntegration } from '../../../../store/slices/diagram-slice/actions';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../../utils/show-snackbar';
import { withIntegrationThroughProps } from './with-integration-through-props';
import { IntegrationWrapper } from './wrapper/integration-wrapper';

vi.mock('@/store/slices/diagram-slice/actions', () => ({
  getStoreDataForIntegration: vi.fn(),
}));

vi.mock('./wrapper/integration-wrapper', () => ({
  IntegrationWrapper: vi.fn(() => null),
}));

vi.mock('../../utils/show-snackbar', () => ({
  showSnackbarSaveSuccessIfNeeded: vi.fn(),
  showSnackbarSaveErrorIfNeeded: vi.fn(),
}));

const storeData = { name: 'diagram', globalVariables: {}, nodes: [], edges: [], layoutDirection: 'RIGHT' as const };

function Inner() {
  return null;
}

function renderAndGetOnSave(onDataSave: ReturnType<typeof vi.fn>) {
  const WrappedComponent = withIntegrationThroughProps(Inner);
  render(<WrappedComponent onDataSave={onDataSave} />);
  return vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0].onSave;
}

describe('withIntegrationThroughProps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoreDataForIntegration).mockReturnValue(storeData);
  });

  it('calls onDataSave with current store data', async () => {
    const onDataSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(onDataSave);

    await act(() => onSave());

    expect(onDataSave).toHaveBeenCalledWith(storeData, undefined);
  });

  it('passes savingParams to onDataSave', async () => {
    const onDataSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(onDataSave);

    await act(() => onSave({ isAutoSave: true }));

    expect(onDataSave).toHaveBeenCalledWith(storeData, { isAutoSave: true });
  });

  it('returns success when onDataSave resolves', async () => {
    const onDataSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(onDataSave);

    const result = await act(() => onSave());
    expect(result).toBe('success');
  });

  it('returns error when onDataSave throws', async () => {
    const onDataSave = vi.fn().mockRejectedValue(new Error('save failed'));
    const onSave = renderAndGetOnSave(onDataSave);

    const result = await act(() => onSave());
    expect(result).toBe('error');
  });

  it('shows success snackbar when onDataSave resolves', async () => {
    const onDataSave = vi.fn().mockResolvedValue('success');
    const onSave = renderAndGetOnSave(onDataSave);

    await act(() => onSave());

    expect(vi.mocked(showSnackbarSaveSuccessIfNeeded)).toHaveBeenCalled();
  });

  it('shows error snackbar when onDataSave throws', async () => {
    const onDataSave = vi.fn().mockRejectedValue(new Error('fail'));
    const onSave = renderAndGetOnSave(onDataSave);

    await act(() => onSave());

    expect(vi.mocked(showSnackbarSaveErrorIfNeeded)).toHaveBeenCalled();
  });

  it('passes initial props (name, nodes, edges, layoutDirection) to IntegrationWrapper', () => {
    const onDataSave = vi.fn();
    const WrappedComponent = withIntegrationThroughProps(Inner);
    render(
      <WrappedComponent onDataSave={onDataSave} name="test-diagram" layoutDirection="DOWN" nodes={[]} edges={[]} />,
    );

    const { name, layoutDirection } = vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0];
    expect(name).toBe('test-diagram');
    expect(layoutDirection).toBe('DOWN');
  });
});
