import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getStoreDataForIntegration } from '../../../../store/slices/diagram-slice/actions';
import { showSnackbarSaveErrorIfNeeded, showSnackbarSaveSuccessIfNeeded } from '../../utils/show-snackbar';
import { withIntegrationThroughLocalStorage } from './with-integration-through-local-storage';
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

const localStorageKey = 'workflowBuilderDiagram';
const storeData = { name: 'diagram', globalVariables: {}, nodes: [], edges: [], layoutDirection: 'RIGHT' as const };

function Inner() {
  return null;
}

function renderHOC() {
  const WrappedComponent = withIntegrationThroughLocalStorage(Inner);
  render(<WrappedComponent />);
  return vi.mocked(IntegrationWrapper).mock.calls.at(-1)![0];
}

describe('withIntegrationThroughLocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    vi.mocked(getStoreDataForIntegration).mockReturnValue(storeData);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial data loading', () => {
    it('passes undefined props when localStorage is empty', () => {
      const { name, nodes } = renderHOC();
      expect(name).toBeUndefined();
      expect(nodes).toBeUndefined();
    });

    it('passes stored name and layoutDirection to IntegrationWrapper', () => {
      const diagram = { name: 'saved', nodes: [], edges: [], layoutDirection: 'DOWN' };
      localStorage.setItem(localStorageKey, JSON.stringify(diagram));
      const { name, layoutDirection } = renderHOC();
      expect(name).toBe('saved');
      expect(layoutDirection).toBe('DOWN');
    });

    it('passes stored nodes and edges to IntegrationWrapper', () => {
      const nodes = [{ id: '1', type: 'default', position: { x: 0, y: 0 }, data: {} }];
      const edges = [{ id: 'e1', source: '1', target: '2' }];
      localStorage.setItem(localStorageKey, JSON.stringify({ nodes, edges }));
      const { nodes: passedNodes, edges: passedEdges } = renderHOC();
      expect(passedNodes).toEqual(nodes);
      expect(passedEdges).toEqual(edges);
    });

    it('passes undefined props when localStorage contains invalid JSON', () => {
      localStorage.setItem(localStorageKey, 'not-valid-json{');
      const { name } = renderHOC();
      expect(name).toBeUndefined();
    });
  });

  describe('handleSave', () => {
    it('writes store data to localStorage on save', async () => {
      const { onSave } = renderHOC();
      const savePromise = onSave();
      await vi.runAllTimersAsync();
      await savePromise;
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify(storeData));
    });

    it('resolves with success after delay', async () => {
      const { onSave } = renderHOC();
      const savePromise = onSave();
      await vi.runAllTimersAsync();
      const result = await savePromise;
      expect(result).toBe('success');
    });

    it('calls showSnackbarSaveSuccessIfNeeded with savingParams', async () => {
      const { onSave } = renderHOC();
      const savePromise = onSave({ isAutoSave: true });
      await vi.runAllTimersAsync();
      await savePromise;
      expect(vi.mocked(showSnackbarSaveSuccessIfNeeded)).toHaveBeenCalledWith({ isAutoSave: true });
    });

    it('returns error and calls showSnackbarSaveErrorIfNeeded when localStorage throws', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      vi.useRealTimers();

      const { onSave } = renderHOC();
      const result = await act(() => onSave());

      expect(result).toBe('error');
      expect(vi.mocked(showSnackbarSaveErrorIfNeeded)).toHaveBeenCalled();
    });

    it('calls getStoreDataForIntegration to get current diagram data', async () => {
      const { onSave } = renderHOC();
      const savePromise = onSave();
      await vi.runAllTimersAsync();
      await savePromise;
      expect(vi.mocked(getStoreDataForIntegration)).toHaveBeenCalled();
    });
  });
});
