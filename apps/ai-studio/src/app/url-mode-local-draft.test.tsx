import { getStoreNodes } from '@workflowbuilder/sdk';
import { act, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationContext } from '../../../../packages/sdk/src/features/integration/components/integration-variants/context/integration-context-wrapper';
import { RuntimeIntegrationWrapper } from '../../../../packages/sdk/src/features/integration/components/runtime-integration-wrapper';
import { SaveButton } from '../../../../packages/sdk/src/features/integration/components/save-button/save-button';
import { OptionalAppBarTools } from '../../../../packages/sdk/src/features/plugins-core/components/app/optional-app-bar-toolbar';
import { resolveIntegration } from '../../../../packages/sdk/src/workflow-builder-root/resolve-integration';
import { refundReviewFlow } from '../data/refund-review-flow';
import { plugin as openFromUrlPlugin } from '../plugins/open-from-url/plugin';
import { useDiagramSourceStore } from '../stores/use-diagram-source-store';
import type { OpenedSource } from '../utils/open-from-url/resolve-diagram-source';
import { rootPropsFor } from './root-props';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

// Loading and saving call enqueueSnackbar, which needs a provider this test does not mount.
vi.mock('../../../../packages/sdk/src/utils/show-snackbar', () => ({ showSnackbar: vi.fn() }));
vi.mock('../../../../packages/sdk/src/features/integration/utils/show-snackbar', () => ({
  showSnackbarSaveSuccessIfNeeded: vi.fn(),
  showSnackbarSaveErrorIfNeeded: vi.fn(),
}));

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LOCAL_DRAFT_KEY = 'workflowBuilderDiagram';
const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
const diagram = { nodes: refundReviewFlow.value.diagram.nodes, edges: refundReviewFlow.value.diagram.edges };
const otherLocalDraft = JSON.stringify({
  name: 'Local draft',
  nodes: [{ id: 'local-1', type: 'node', position: { x: 0, y: 0 }, data: { type: 'x', properties: {} } }],
  edges: [],
});

let save: ((isAutoSave: boolean) => Promise<unknown>) | undefined;

function SaveHandle() {
  const { onSave } = useContext(IntegrationContext);
  save = (isAutoSave) => onSave({ isAutoSave });
  return null;
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function mount(opened: OpenedSource) {
  const props = rootPropsFor(opened);
  const { strategy, endpoints, onDataSave } = resolveIntegration(props.integration);
  act(() =>
    root.render(
      <RuntimeIntegrationWrapper
        strategy={strategy}
        endpoints={endpoints}
        onDataSave={onDataSave}
        name={props.name}
        nodes={props.initialNodes}
        edges={props.initialEdges}
      >
        <OptionalAppBarTools>
          <SaveButton />
        </OptionalAppBarTools>
        <SaveHandle />
      </RuntimeIntegrationWrapper>,
    ),
  );
}

async function leaveThePage() {
  await act(async () => {
    globalThis.dispatchEvent(new Event('beforeunload'));
    await vi.advanceTimersByTimeAsync(1000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem(LOCAL_DRAFT_KEY, otherLocalDraft);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

// Decorators register for the whole file, so the local case runs before the plugin is registered.
describe('the local draft in URL mode', () => {
  it('is written in local mode when the page closes, so the check below can see a write', async () => {
    mount({ kind: 'local' });

    await leaveThePage();

    expect(localStorage.getItem(LOCAL_DRAFT_KEY)).not.toBe(otherLocalDraft);
  });

  it("is neither shown nor written when a link opens a workflow, and the editor's Save button is replaced", async () => {
    openFromUrlPlugin();
    useDiagramSourceStore.setState({ targetWorkflowId: WORKFLOW, isRunView: false });

    mount({ kind: 'workflow', workflowId: WORKFLOW, name: 'Refund desk', diagram });

    expect(getStoreNodes().map((node) => node.id)).toEqual(diagram.nodes.map((node) => node.id));
    const buttons = [...container.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'));
    expect(buttons).toEqual(['Save the workflow draft']);

    await leaveThePage();
    await act(async () => {
      await save?.(true);
      await save?.(false);
    });

    expect(localStorage.getItem(LOCAL_DRAFT_KEY)).toBe(otherLocalDraft);
  });
});
