// Each mocked component below is invoked as a plain function (not JSX) from inside its
// counting wrapper, so the real implementation still runs within that same render pass -
// the counter is a spy, not a stub.
import { act, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetWorkflowStore } from '../../store/store';
import { WorkflowBuilderRoot } from '../../workflow-builder-root/workflow-builder-root';
import { trackFutureChange, useChangesTrackerStore } from '../changes-tracker/stores/use-changes-tracker-store';
import type * as DefaultLayoutModule from '../default-layout/default-layout';
import '../i18n/index';
import type * as EditorRuntimeModule from './editor-runtime';

const renderCounts = { defaultLayout: 0, editorRuntime: 0 };

vi.mock('../default-layout/default-layout', async (importOriginal) => {
  const actual = await importOriginal<typeof DefaultLayoutModule>();
  return {
    DefaultLayout: () => {
      renderCounts.defaultLayout += 1;
      return actual.DefaultLayout();
    },
  };
});

vi.mock('./editor-runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof EditorRuntimeModule>();
  return {
    EditorRuntime: () => {
      renderCounts.editorRuntime += 1;
      return actual.EditorRuntime();
    },
  };
});

beforeEach(() => {
  // React Flow observes the size of its pane as it mounts; jsdom has no ResizeObserver.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  resetWorkflowStore();
  useChangesTrackerStore.setState({ lastChangeName: '', lastChangeParams: {}, lastChangeTimestamp: Date.now() });
  renderCounts.defaultLayout = 0;
  renderCounts.editorRuntime = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('EditorRuntime render isolation', () => {
  it('a diagram change re-renders EditorRuntime but not DefaultLayout', async () => {
    render(
      <StrictMode>
        <WorkflowBuilderRoot />
      </StrictMode>,
    );

    // Lazy subcomponents of DefaultLayout (AppBar/Palette/PropertiesBar) resolve async.
    await waitFor(() => expect(renderCounts.defaultLayout).toBeGreaterThan(0));
    const defaultLayoutCountBeforeChange = renderCounts.defaultLayout;
    const editorRuntimeCountBeforeChange = renderCounts.editorRuntime;
    expect(editorRuntimeCountBeforeChange).toBeGreaterThan(0);

    act(() => {
      trackFutureChange('nodeChange');
    });

    await waitFor(() => expect(renderCounts.editorRuntime).toBeGreaterThan(editorRuntimeCountBeforeChange));
    expect(renderCounts.defaultLayout).toBe(defaultLayoutCountBeforeChange);
  });
});
