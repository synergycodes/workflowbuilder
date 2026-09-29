import { setStoreEdges, setStoreNodes, useStore } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BACKEND_URL } from '../../config';
import { refundReviewFlow } from '../../data/refund-review-flow';
import { useDiagramSourceStore } from '../../stores/use-diagram-source-store';
import { jsonResponse } from '../../test/json-response';
import { UrlModeAppBarTools } from './url-mode-app-bar-tools';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
const { nodes, edges } = refundReviewFlow.value.diagram;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let fetchMock: ReturnType<typeof vi.fn>;

const saveButton = () => container.querySelector<HTMLButtonElement>('button[aria-label="Save the workflow draft"]');

function render(targetWorkflowId?: string) {
  useDiagramSourceStore.setState({ targetWorkflowId, notices: [] });
  act(() => root.render(<UrlModeAppBarTools />));
}

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse(200, { id: WORKFLOW, name: 'Refund desk' }));
  vi.stubGlobal('fetch', fetchMock);
  useStore.getState().setToggleReadOnlyMode(false);
  setStoreNodes(nodes);
  setStoreEdges(edges);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('UrlModeAppBarTools', () => {
  it('shows no Save button when nothing on the backend takes the diagram', () => {
    render();

    expect(container.innerHTML).toBe('');
  });

  it("saves the canvas as the workflow's draft", async () => {
    render(WORKFLOW);

    await act(async () => saveButton()!.click());

    expect(fetchMock).toHaveBeenCalledWith(`${BACKEND_URL}/api/workflows/${WORKFLOW}/draft`, expect.anything());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string) as { draftJson: { nodes: unknown[]; edges: unknown[] } };
    expect(body.draftJson.nodes).toHaveLength(nodes.length);
    expect(body.draftJson.edges).toHaveLength(edges.length);
    expect(useDiagramSourceStore.getState().notices).toMatchObject([{ variant: 'success' }]);
  });

  it('says so when the draft could not be saved', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(404, { code: 'workflow_not_found' }));
    render(WORKFLOW);

    await act(async () => saveButton()!.click());

    expect(useDiagramSourceStore.getState().notices).toMatchObject([{ variant: 'error' }]);
  });

  it('cannot save while the canvas is read-only', () => {
    useStore.getState().setToggleReadOnlyMode(true);
    render(WORKFLOW);

    expect(saveButton()!.disabled).toBe(true);
  });
});
