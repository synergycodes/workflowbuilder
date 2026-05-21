/**
 * Tests for RuntimeIntegrationWrapper (added in api-02 branch).
 * These tests require the file to exist — they pass after the api-02 branch is in scope.
 */
import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getStoreDataForIntegration } from '../../../store/slices/diagram-slice/actions';
import {
  showSnackbarSaveErrorIfNeeded as _showSnackbarSaveErrorIfNeeded,
  showSnackbarSaveSuccessIfNeeded,
} from '../utils/show-snackbar';
import { IntegrationWrapper } from './integration-variants/wrapper/integration-wrapper';
import { RuntimeIntegrationWrapper } from './runtime-integration-wrapper';

vi.mock('@/store/slices/diagram-slice/actions', () => ({
  getStoreDataForIntegration: vi.fn(),
}));

vi.mock('./integration-variants/wrapper/integration-wrapper', () => ({
  IntegrationWrapper: vi.fn(({ children }: React.PropsWithChildren) => <>{children}</>),
}));

vi.mock('../utils/show-snackbar', () => ({
  showSnackbarSaveSuccessIfNeeded: vi.fn(),
  showSnackbarSaveErrorIfNeeded: vi.fn(),
}));

const mockFetch = vi.fn();
const storeData = { name: 'diagram', globalVariables: {}, nodes: [], edges: [], layoutDirection: 'RIGHT' as const };
const localStorageKey = 'workflowBuilderDiagram';

function getOnSave(props: React.ComponentProps<typeof RuntimeIntegrationWrapper>) {
  render(<RuntimeIntegrationWrapper {...props} />);
  return vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0].onSave;
}

describe('RuntimeIntegrationWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    vi.stubGlobal('fetch', mockFetch);
    vi.mocked(getStoreDataForIntegration).mockReturnValue(storeData);
    mockFetch.mockResolvedValue({ ok: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('strategy: localStorage', () => {
    it('passes initial props to IntegrationWrapper on first render', () => {
      render(<RuntimeIntegrationWrapper strategy="localStorage" name="initial" layoutDirection="DOWN" />);
      const firstCall = vi.mocked(IntegrationWrapper).mock.calls[0][0];
      expect(firstCall.name).toBe('initial');
      expect(firstCall.layoutDirection).toBe('DOWN');
    });

    it('loads data from localStorage and re-renders with it', async () => {
      const stored = { name: 'from-storage', nodes: [], edges: [], layoutDirection: 'DOWN' };
      localStorage.setItem(localStorageKey, JSON.stringify(stored));

      await act(async () => {
        render(<RuntimeIntegrationWrapper strategy="localStorage" />);
      });

      const lastCall = vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0];
      expect(lastCall.name).toBe('from-storage');
    });

    it('ignores invalid JSON in localStorage', async () => {
      localStorage.setItem(localStorageKey, '{invalid}');

      await act(async () => {
        render(<RuntimeIntegrationWrapper strategy="localStorage" name="initial" />);
      });

      const lastCall = vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0];
      expect(lastCall.name).toBe('initial');
    });

    it('saves data to localStorage', async () => {
      const onSave = getOnSave({ strategy: 'localStorage' });
      const promise = onSave();
      await vi.runAllTimersAsync();
      await promise;
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify(storeData));
    });

    it('resolves with success after saving', async () => {
      const onSave = getOnSave({ strategy: 'localStorage' });
      const promise = onSave();
      await vi.runAllTimersAsync();
      expect(await promise).toBe('success');
    });

    it('returns error when localStorage write throws', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'localStorage' });
      const result = await act(() => onSave());
      expect(result).toBe('error');
    });
  });

  describe('strategy: api', () => {
    const endpoints = { load: '/api/load', save: '/api/save' };

    it('fetches from load endpoint on mount', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      await act(async () => {
        render(<RuntimeIntegrationWrapper strategy="api" endpoints={endpoints} />);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/load');
    });

    it('updates state with data from load endpoint', async () => {
      const apiData = { name: 'from-api', nodes: [], edges: [], layoutDirection: 'DOWN' };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(apiData) });

      await act(async () => {
        render(<RuntimeIntegrationWrapper strategy="api" endpoints={endpoints} />);
      });

      const lastCall = vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0];
      expect(lastCall.name).toBe('from-api');
    });

    it('does not update state when load response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await act(async () => {
        render(<RuntimeIntegrationWrapper strategy="api" endpoints={endpoints} name="initial" />);
      });

      const lastCall = vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0];
      expect(lastCall.name).toBe('initial');
    });

    it('POSTs store data to save endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'api', endpoints });

      await act(() => onSave());

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/save',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(storeData) }),
      );
    });

    it('returns success when save response is ok', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'api', endpoints });

      const result = await act(() => onSave());
      expect(result).toBe('success');
    });

    it('returns error when save response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'api', endpoints });

      const result = await act(() => onSave());
      expect(result).toBe('error');
    });

    it('returns error when save fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('network'));
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'api', endpoints });

      const result = await act(() => onSave());
      expect(result).toBe('error');
    });

    it('shows success snackbar on successful save', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'api', endpoints });

      await act(() => onSave());

      expect(vi.mocked(showSnackbarSaveSuccessIfNeeded)).toHaveBeenCalled();
    });
  });

  describe('strategy: props', () => {
    it('calls onDataSave with current store data', async () => {
      const onDataSave = vi.fn().mockResolvedValue('success');
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'props', onDataSave });

      await act(() => onSave());

      expect(onDataSave).toHaveBeenCalledWith(storeData, undefined);
    });

    it('passes savingParams to onDataSave', async () => {
      const onDataSave = vi.fn().mockResolvedValue('success');
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'props', onDataSave });

      await act(() => onSave({ isAutoSave: true }));

      expect(onDataSave).toHaveBeenCalledWith(storeData, { isAutoSave: true });
    });

    it('returns success when onDataSave resolves', async () => {
      const onDataSave = vi.fn().mockResolvedValue('success');
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'props', onDataSave });

      const result = await act(() => onSave());
      expect(result).toBe('success');
    });

    it('returns error when onDataSave throws', async () => {
      const onDataSave = vi.fn().mockRejectedValue(new Error('save failed'));
      vi.useRealTimers();
      const onSave = getOnSave({ strategy: 'props', onDataSave });

      const result = await act(() => onSave());
      expect(result).toBe('error');
    });

    it('does not fetch anything on mount', async () => {
      await act(async () => {
        render(<RuntimeIntegrationWrapper strategy="props" onDataSave={vi.fn()} />);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
