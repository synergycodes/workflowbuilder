import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setStoreDataFromIntegration } from '../../../store/slices/diagram-slice/actions';
import { showSnackbar } from '../../../utils/show-snackbar';
import { openTemplateSelectorModal } from '../../modals/template-selector/open-template-selector-modal';
import { getStoreSavingStatus, loadData, setStoreSavingStatus, useIntegrationStore } from './use-integration-store';

vi.mock('@workflowbuilder/ui', () => ({
  SnackbarType: { SUCCESS: 'SUCCESS', ERROR: 'ERROR', INFO: 'INFO', WARNING: 'WARNING' },
}));

vi.mock('@/store/slices/diagram-slice/actions', () => ({
  setStoreDataFromIntegration: vi.fn(),
}));

vi.mock('@/features/modals/template-selector/open-template-selector-modal', () => ({
  openTemplateSelectorModal: vi.fn(),
}));

vi.mock('@/utils/show-snackbar', () => ({
  showSnackbar: vi.fn(),
}));

describe('use-integration-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationStore.setState({ savingStatus: 'disabled', lastSaveAttemptTimestamp: 0 });
  });

  describe('loadData', () => {
    it('calls setStoreDataFromIntegration when data contains values', () => {
      loadData({ name: 'my diagram' });
      expect(vi.mocked(setStoreDataFromIntegration)).toHaveBeenCalledWith({ name: 'my diagram' });
    });

    it('does not call setStoreDataFromIntegration when all values are falsy', () => {
      loadData({});
      expect(vi.mocked(setStoreDataFromIntegration)).not.toHaveBeenCalled();
    });

    it('opens template selector modal when data is empty', () => {
      loadData({});
      expect(vi.mocked(openTemplateSelectorModal)).toHaveBeenCalledOnce();
    });

    it('does not open template selector when data has values', () => {
      loadData({ name: 'diagram' });
      expect(vi.mocked(openTemplateSelectorModal)).not.toHaveBeenCalled();
    });

    it('shows success snackbar when data is provided', () => {
      loadData({ nodes: [] });
      expect(vi.mocked(showSnackbar)).toHaveBeenCalledWith(expect.objectContaining({ title: 'restoreDiagramSuccess' }));
    });

    it('sets savingStatus to waiting when data is provided', () => {
      loadData({ name: 'test' });
      expect(getStoreSavingStatus()).toBe('waiting');
    });

    it('sets savingStatus to waiting when data is empty', () => {
      loadData({});
      expect(getStoreSavingStatus()).toBe('waiting');
    });

    it('considers nodes array (even empty) as having data', () => {
      loadData({ nodes: [] });
      // [] is falsy via Boolean([]) === true... wait, [] is truthy in JS
      expect(vi.mocked(setStoreDataFromIntegration)).toHaveBeenCalled();
    });
  });

  describe('getStoreSavingStatus', () => {
    it('returns the current saving status', () => {
      useIntegrationStore.setState({ savingStatus: 'saving', lastSaveAttemptTimestamp: 0 });
      expect(getStoreSavingStatus()).toBe('saving');
    });

    it('reflects status changes', () => {
      useIntegrationStore.setState({ savingStatus: 'saved', lastSaveAttemptTimestamp: 0 });
      expect(getStoreSavingStatus()).toBe('saved');
    });
  });

  describe('setStoreSavingStatus', () => {
    it('updates saving status', () => {
      setStoreSavingStatus('notSaved');
      expect(getStoreSavingStatus()).toBe('notSaved');
    });

    it('can set to saving', () => {
      setStoreSavingStatus('saving');
      expect(getStoreSavingStatus()).toBe('saving');
    });

    it('updates lastSaveAttemptTimestamp when status is saved', () => {
      setStoreSavingStatus('saved');
      expect(useIntegrationStore.getState().lastSaveAttemptTimestamp).toBeGreaterThan(0);
    });

    it('does not change lastSaveAttemptTimestamp for non-saved statuses', () => {
      useIntegrationStore.setState({ savingStatus: 'waiting', lastSaveAttemptTimestamp: 12_345 });
      setStoreSavingStatus('notSaved');
      expect(useIntegrationStore.getState().lastSaveAttemptTimestamp).toBe(12_345);
    });

    it('does not change lastSaveAttemptTimestamp when setting to saving', () => {
      useIntegrationStore.setState({ savingStatus: 'waiting', lastSaveAttemptTimestamp: 99_999 });
      setStoreSavingStatus('saving');
      expect(useIntegrationStore.getState().lastSaveAttemptTimestamp).toBe(99_999);
    });
  });
});
