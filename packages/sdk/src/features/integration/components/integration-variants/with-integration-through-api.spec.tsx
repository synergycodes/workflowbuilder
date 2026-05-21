import { render } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStoreDataForIntegration } from '../../../../store/slices/diagram-slice/actions';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../../utils/show-snackbar';
import { withIntegrationThroughApi } from './with-integration-through-api';
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

const mockFetch = vi.fn();
const storeData = { name: 'diagram', globalVariables: {}, nodes: [], edges: [], layoutDirection: 'RIGHT' as const };

function Inner() {
  return null;
}

function getOnSave() {
  const WrappedComponent = withIntegrationThroughApi(Inner);
  render(<WrappedComponent />);
  return vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0].onSave;
}

describe('withIntegrationThroughApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.mocked(getStoreDataForIntegration).mockReturnValue(storeData);
    mockFetch.mockResolvedValue({ ok: false });
  });

  describe('initial data loading', () => {
    it('fetches from /fake-api on mount', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      await act(async () => {
        const WrappedComponent = withIntegrationThroughApi(Inner);
        render(<WrappedComponent />);
      });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/fake-api'));
    });

    it('updates IntegrationWrapper props with loaded data', async () => {
      const loadedData = { name: 'from-api', nodes: [], edges: [], layoutDirection: 'DOWN' };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(loadedData) });

      await act(async () => {
        const WrappedComponent = withIntegrationThroughApi(Inner);
        render(<WrappedComponent />);
      });

      const lastCall = vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0];
      expect(lastCall.name).toBe('from-api');
    });

    it('does not update state when response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await act(async () => {
        const WrappedComponent = withIntegrationThroughApi(Inner);
        render(<WrappedComponent />);
      });

      const lastCall = vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0];
      expect(lastCall.name).toBeUndefined();
    });

    it('does not throw when fetch fails on mount', async () => {
      mockFetch.mockRejectedValue(new Error('network error'));

      await expect(
        act(async () => {
          const WrappedComponent = withIntegrationThroughApi(Inner);
          render(<WrappedComponent />);
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('handleSave', () => {
    it('POSTs store data to /fake-api', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const onSave = getOnSave();

      await act(() => onSave());

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/fake-api'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sends JSON content-type header', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const onSave = getOnSave();

      await act(() => onSave());

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
      );
    });

    it('sends serialized store data in request body', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const onSave = getOnSave();

      await act(() => onSave());

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: JSON.stringify(storeData) }),
      );
    });

    it('returns success when POST response is ok', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const onSave = getOnSave();

      const result = await act(() => onSave());
      expect(result).toBe('success');
    });

    it('returns error when POST response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      const onSave = getOnSave();

      const result = await act(() => onSave());
      expect(result).toBe('error');
    });

    it('returns error when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('network error'));
      const onSave = getOnSave();

      const result = await act(() => onSave());
      expect(result).toBe('error');
    });

    it('shows success snackbar on successful save', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const onSave = getOnSave();

      await act(() => onSave());

      expect(vi.mocked(showSnackbarSaveSuccessIfNeeded)).toHaveBeenCalled();
    });

    it('shows error snackbar on failed save', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      const onSave = getOnSave();

      await act(() => onSave());

      expect(vi.mocked(showSnackbarSaveErrorIfNeeded)).toHaveBeenCalled();
    });
  });
});
