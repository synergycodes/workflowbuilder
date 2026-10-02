import { getStoreNodes, useChangesTrackerStore, useStore } from '@workflowbuilder/sdk';
import { act, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationContext } from '../../../../packages/sdk/src/features/integration/components/integration-variants/context/integration-context-wrapper';
import { RuntimeIntegrationWrapper } from '../../../../packages/sdk/src/features/integration/components/runtime-integration-wrapper';
import { SaveButton } from '../../../../packages/sdk/src/features/integration/components/save-button/save-button';
import {
  showSnackbarSaveErrorIfNeeded,
  showSnackbarSaveSuccessIfNeeded,
} from '../../../../packages/sdk/src/features/integration/utils/show-snackbar';
import { OptionalAppBarTools } from '../../../../packages/sdk/src/features/plugins-core/components/app/optional-app-bar-toolbar';
import { resolveIntegration } from '../../../../packages/sdk/src/workflow-builder-root/resolve-integration';
import { BACKEND_URL } from '../config';
import { refundReviewFlow } from '../data/refund-review-flow';
import { plugin as runViewPlugin } from '../plugins/run-view/plugin';
import { jsonResponse } from '../test/json-response';
import type { OpenedSource } from './open-from-url';
import { rootPropsFor } from './root-props';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

// Loading and saving call enqueueSnackbar, which needs a provider this test does not mount.
vi.mock('../../../../packages/sdk/src/utils/show-translated-snackbar', () => ({ showTranslatedSnackbar: vi.fn() }));
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
const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
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
let fetchMock: ReturnType<typeof vi.fn>;

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

// A real edit between saves, so each save carries something new.
const moveFirstNode = () =>
  act(() =>
    useStore.setState((state) => ({
      nodes: state.nodes.map((node, index) =>
        index === 0 ? { ...node, position: { x: node.position.x + 10, y: node.position.y } } : node,
      ),
    })),
  );

const draftPatches = () =>
  fetchMock.mock.calls.filter(
    ([url, init]) => String(url).endsWith('/draft') && (init as RequestInit | undefined)?.method === 'PATCH',
  );

beforeEach(() => {
  vi.mocked(showSnackbarSaveSuccessIfNeeded).mockClear();
  vi.mocked(showSnackbarSaveErrorIfNeeded).mockClear();
  useChangesTrackerStore.setState({ lastChangeName: '', lastChangeTimestamp: 0 });
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem(LOCAL_DRAFT_KEY, otherLocalDraft);
  fetchMock = vi.fn(async () => jsonResponse(200, { id: WORKFLOW, name: 'Refund desk' }));
  vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// Decorators register for the whole file, so the run view, which registers one, goes last.
describe('the local draft in URL mode', () => {
  it('is written in local mode when the page closes, so the checks below can see a write', async () => {
    mount({ kind: 'local' });

    await leaveThePage();

    expect(localStorage.getItem(LOCAL_DRAFT_KEY)).not.toBe(otherLocalDraft);
  });

  it("a workflow from the link keeps the editor's Save button, and Save, autosave and the save on close go to its draft", async () => {
    mount({ kind: 'workflow', workflowId: WORKFLOW, name: 'Refund desk', diagram });

    expect(getStoreNodes().map((node) => node.id)).toEqual(diagram.nodes.map((node) => node.id));
    expect(container.querySelectorAll('button')).toHaveLength(1);

    await act(async () => {
      await save?.(false);
    });
    moveFirstNode();
    await act(async () => {
      await save?.(true);
    });
    moveFirstNode();
    await leaveThePage();

    expect(draftPatches()).toHaveLength(3);
    expect(draftPatches()[0]![0]).toBe(`${BACKEND_URL}/api/workflows/${WORKFLOW}/draft`);
    expect(localStorage.getItem(LOCAL_DRAFT_KEY)).toBe(otherLocalDraft);
  });

  it('a workflow link opened and closed without an edit writes nothing', async () => {
    mount({ kind: 'workflow', workflowId: WORKFLOW, name: 'Refund desk', diagram });

    await leaveThePage();

    expect(draftPatches()).toHaveLength(0);
  });

  it("a Save the server refuses shows the SDK's error, not its success", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(500, { message: 'boom' }));
    mount({ kind: 'workflow', workflowId: WORKFLOW, name: 'Refund desk', diagram });

    let status: unknown;
    await act(async () => {
      status = await save?.(false);
    });

    expect(status).toBe('error');
    expect(showSnackbarSaveSuccessIfNeeded).not.toHaveBeenCalled();
    expect(showSnackbarSaveErrorIfNeeded).toHaveBeenCalledWith({ isAutoSave: false });
  });

  it('a run from the link has no Save button, saves nowhere and leaves the local draft alone', async () => {
    runViewPlugin();

    mount({ kind: 'execution', executionId: RUN, diagram });

    expect(container.querySelectorAll('button')).toHaveLength(0);
    await leaveThePage();
    expect(draftPatches()).toHaveLength(0);
    expect(localStorage.getItem(LOCAL_DRAFT_KEY)).toBe(otherLocalDraft);
  });
});
