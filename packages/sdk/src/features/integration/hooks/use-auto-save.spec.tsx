import { act, cleanup, render } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OnSave } from '../../../types/integration';
import { trackFutureChange, useChangesTrackerStore } from '../../changes-tracker/stores/use-changes-tracker-store';
import { IntegrationContext } from '../components/integration-variants/context/integration-context-wrapper';
import { useIntegrationStore } from '../stores/use-integration-store';
import { useAutoSave } from './use-auto-save';

// overflow-ui ships a CSS side-effect import that vitest can't transform from
// node_modules; stub it so the real integration/changes-tracker stores load.
vi.mock('@synergycodes/overflow-ui', () => ({
  SnackbarType: { SUCCESS: 'success', ERROR: 'error', WARNING: 'warning', INFO: 'info' },
}));

const TEN_SECONDS_MS = 10_000;
const AUTO_SAVE_DELAY_MS = 400;

function Wrapper({ onSave, children }: PropsWithChildren<{ onSave: OnSave }>) {
  return <IntegrationContext.Provider value={{ onSave }}>{children}</IntegrationContext.Provider>;
}

function renderAutoSaveHost(onSave: OnSave = vi.fn()) {
  const renderCount = { current: 0 };

  function Host() {
    renderCount.current += 1;
    useAutoSave();
    return null;
  }

  render(
    <Wrapper onSave={onSave}>
      <Host />
    </Wrapper>,
  );

  return renderCount;
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T00:00:00Z'));
    useChangesTrackerStore.setState({ lastChangeName: '', lastChangeParams: {}, lastChangeTimestamp: Date.now() });
    useIntegrationStore.setState({ savingStatus: 'disabled', lastSaveAttemptTimestamp: Date.now() });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not re-render its host when tracked changes tick (e.g. during a drag)', () => {
    const renderCount = renderAutoSaveHost();
    expect(renderCount.current).toBe(1);

    act(() => {
      trackFutureChange('nodeDragChange');
      trackFutureChange('nodeDragChange');
      trackFutureChange('addNode');
    });

    expect(renderCount.current).toBe(1);
  });

  it('autosaves after the debounce when an idle period preceded the change', () => {
    const onSave = vi.fn();
    renderAutoSaveHost(onSave);

    act(() => {
      useIntegrationStore.setState({ lastSaveAttemptTimestamp: Date.now() - (TEN_SECONDS_MS + 5000) });
      trackFutureChange('addNode');
    });

    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS);
    });

    expect(onSave).toHaveBeenCalledWith({ isAutoSave: true });
  });

  it('does not autosave for skipped drag events', () => {
    const onSave = vi.fn();
    renderAutoSaveHost(onSave);

    act(() => {
      useIntegrationStore.setState({ lastSaveAttemptTimestamp: Date.now() - (TEN_SECONDS_MS + 5000) });
      trackFutureChange('nodeDragChange');
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not autosave when the change is more recent than the idle threshold', () => {
    const onSave = vi.fn();
    renderAutoSaveHost(onSave);

    act(() => {
      // lastSaveAttemptTimestamp is "now", so the difference is below the threshold.
      trackFutureChange('addNode');
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('cancels a pending autosave when a save lands before the debounce fires', () => {
    const onSave = vi.fn();
    renderAutoSaveHost(onSave);

    act(() => {
      useIntegrationStore.setState({ lastSaveAttemptTimestamp: Date.now() - (TEN_SECONDS_MS + 5000) });
      trackFutureChange('addNode');
    });
    act(() => {
      // A save updates lastSaveAttemptTimestamp before the 400ms debounce elapses.
      useIntegrationStore.setState({ lastSaveAttemptTimestamp: Date.now() });
      vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS);
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});
