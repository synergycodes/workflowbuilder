import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetWorkflowStore } from '../../store/store';
import type { OnSaveExternal } from '../../types/integration';
import { WorkflowBuilderRoot } from '../../workflow-builder-root/workflow-builder-root';
import { trackFutureChange, useChangesTrackerStore } from '../changes-tracker/stores/use-changes-tracker-store';
import { DiagramContainer } from '../diagram/diagram';
import '../i18n/index';
import { useIntegrationStore } from '../integration/stores/use-integration-store';
import type { BuiltInControls } from '../ui-extensions/built-in-controls';

const { updateNodeInternals } = vi.hoisted(() => ({ updateNodeInternals: vi.fn() }));

// Same capture-stub strategy as `diagram.spec.tsx`: a real `<ReactFlow>` needs DOM
// measurement APIs jsdom does not provide, and this test does not exercise the canvas.
vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  ReactFlow: vi.fn(() => null),
  Background: () => null,
  SelectionMode: { Partial: 'partial' },
  useUpdateNodeInternals: () => updateNodeInternals,
}));

vi.mock('../diagram/hooks/use-node-types', () => ({ useNodeTypes: () => ({}) }));
vi.mock('../diagram/hooks/use-edge-types', () => ({ useEdgeTypes: () => ({}) }));
vi.mock('../diagram/hooks/use-on-connect', () => ({
  useConnect: () => ({ onConnect: vi.fn(), onConnectStart: vi.fn(), onConnectEnd: vi.fn() }),
}));
vi.mock('../diagram/edges/temporary-edge/temporary-edge', () => ({ TemporaryEdge: () => null }));
vi.mock('../../hooks/use-palette-drop', () => ({ usePaletteDrop: () => ({ onDropFromPalette: vi.fn() }) }));
vi.mock('../modals/delete-confirmation/use-delete-confirmation', () => ({
  useDeleteConfirmation: () => ({ openDeleteConfirmationModal: vi.fn() }),
}));

function CustomHeader() {
  return <header>Custom header, no built-in top bar</header>;
}

beforeEach(() => {
  resetWorkflowStore();
  useChangesTrackerStore.setState({ lastChangeName: '', lastChangeParams: {}, lastChangeTimestamp: Date.now() });
  useIntegrationStore.setState({ savingStatus: 'disabled', lastSaveAttemptTimestamp: Date.now() });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderAndTriggerAutoSave(builtInControls?: BuiltInControls) {
  const onDataSave: OnSaveExternal = vi.fn().mockResolvedValue('success');

  render(
    <StrictMode>
      <WorkflowBuilderRoot integration={{ strategy: 'props', onDataSave }} builtInControls={builtInControls}>
        <CustomHeader />
        <DiagramContainer />
      </WorkflowBuilderRoot>
    </StrictMode>,
  );

  // Past the mount's `loadData` reset, move the clock far enough ahead that the
  // upcoming change clears the "changed over 10s ago" auto-save threshold.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(11_000);
  });

  act(() => {
    trackFutureChange('nodeChange');
  });

  // The 400ms auto-save debounce, then let the save promise settle.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });

  return onDataSave;
}

describe('Auto-save without a top bar', () => {
  it('a Root whose children are a custom header and <WorkflowBuilder.Canvas /> (no top bar) auto-saves after a change', async () => {
    const onDataSave = await renderAndTriggerAutoSave();

    expect(onDataSave).toHaveBeenCalledWith(expect.anything(), { isAutoSave: true });
  });

  it('save:false still auto-saves after a change: auto-save does not depend on the Save button', async () => {
    const onDataSave = await renderAndTriggerAutoSave({ save: false });

    expect(onDataSave).toHaveBeenCalledWith(expect.anything(), { isAutoSave: true });
  });
});
