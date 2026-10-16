import { type IntegrationDataFormat, useChangesTrackerStore } from '@workflowbuilder/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BACKEND_URL } from '../config';
import { useNoticesStore } from '../stores/use-notices-store';
import { jsonResponse } from '../test/json-response';
import { patchDraft, saveDraftOf } from './save-workflow-draft';

const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
const node = { id: 'n-1', type: 'node', position: { x: 0, y: 0 }, data: { type: 'x', properties: {} } };
const data = {
  name: 'Refund desk',
  globalVariables: {},
  layoutDirection: 'LR',
  nodes: [node],
  edges: [],
} as unknown as IntegrationDataFormat;
const moved = { ...data, nodes: [{ ...node, position: { x: 40, y: 0 } }] } as unknown as IntegrationDataFormat;

let fetchMock: ReturnType<typeof vi.fn>;

const notices = () => useNoticesStore.getState().notices.map((notice) => notice.text);
const request = () => fetchMock.mock.calls[0] as [string, RequestInit];
const edited = () =>
  useChangesTrackerStore.setState({ lastChangeName: 'nodeDragStop', lastChangeTimestamp: Date.now() + 1 });
const autosave = { isAutoSave: true };

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse(200, { id: WORKFLOW, name: 'Refund desk' }));
  vi.stubGlobal('fetch', fetchMock);
  useNoticesStore.setState({ notices: [] });
  useChangesTrackerStore.setState({ lastChangeName: '', lastChangeTimestamp: 0 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveDraftOf', () => {
  it('PATCHes the nodes and edges into the draft, with keepalive so the save on close outlives the page', async () => {
    const save = saveDraftOf(WORKFLOW);
    edited();

    const status = await save(data, autosave);

    expect(status).toBe('success');
    const [url, init] = request();
    expect(url).toBe(`${BACKEND_URL}/api/workflows/${WORKFLOW}/draft`);
    expect(init.method).toBe('PATCH');
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body as string)).toEqual({ draftJson: { nodes: [node], edges: [] } });
  });

  it('sends a draft of 64 KiB or more without keepalive, which browsers refuse', async () => {
    const big = { ...data, nodes: [{ ...node, data: { type: 'x', properties: { text: 'y'.repeat(70_000) } } }] };
    const save = saveDraftOf(WORKFLOW);
    edited();

    await save(big as unknown as IntegrationDataFormat, autosave);

    expect(request()[1].keepalive).toBe(false);
  });

  it('a failed autosave throws and raises an error notice, which the SDK does not', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(500, { message: 'boom' }));
    const save = saveDraftOf(WORKFLOW);
    edited();

    await expect(save(data, autosave)).rejects.toThrow('the server answered 500');

    expect(notices()).toEqual(['The workflow draft could not be saved automatically: the server answered 500.']);
  });

  it("a failed manual save throws and raises no notice: the SDK's own error snackbar shows", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(500, { message: 'boom' }));

    await expect(saveDraftOf(WORKFLOW)(data, { isAutoSave: false })).rejects.toThrow('the server answered 500');

    expect(notices()).toEqual([]);
  });

  it('no answer from the server is an error too', async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError('Failed to fetch');
    });
    const save = saveDraftOf(WORKFLOW);
    edited();

    await expect(save(data, autosave)).rejects.toThrow('the server did not answer');

    expect(notices()[0]).toContain('the server did not answer');
  });
});

describe('saveDraftOf: an autosave with nothing new', () => {
  it('sends nothing when nothing was edited since the link opened, so closing a tab only looked at writes nothing', async () => {
    expect(await saveDraftOf(WORKFLOW)(data, autosave)).toBe('success');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // React Flow's measuring after mount and a selecting click both reach the SDK's tracker under this name.
  it("sends nothing after only the SDK's node changes, so a tab only looked at writes nothing on close", async () => {
    const save = saveDraftOf(WORKFLOW);
    useChangesTrackerStore.setState({ lastChangeName: 'nodeDragChange', lastChangeTimestamp: Date.now() + 1 });

    expect(await save(data, autosave)).toBe('success');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still sends an edit that a node change followed', async () => {
    const save = saveDraftOf(WORKFLOW);
    edited();
    useChangesTrackerStore.setState({ lastChangeName: 'nodeDragChange', lastChangeTimestamp: Date.now() + 2 });

    await save(data, autosave);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("compares with Run's write too, so going back to an earlier save is sent", async () => {
    const save = saveDraftOf(WORKFLOW);
    await save(data, { isAutoSave: false });
    await patchDraft(WORKFLOW, moved.nodes, moved.edges);

    await save(moved, autosave);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await save(data, autosave);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('sends nothing when the draft is what it last saved', async () => {
    const save = saveDraftOf(WORKFLOW);
    edited();
    await save(data, autosave);

    expect(await save(data, autosave)).toBe('success');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends an edit made after the last save, tracked or not', async () => {
    const save = saveDraftOf(WORKFLOW);
    await save(data, { isAutoSave: false });

    await save(moved, autosave);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never holds back a manual Save', async () => {
    await saveDraftOf(WORKFLOW)(data, { isAutoSave: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends again after a save that failed', async () => {
    fetchMock.mockImplementationOnce(async () => jsonResponse(500, { message: 'boom' }));
    const save = saveDraftOf(WORKFLOW);
    edited();
    await expect(save(data, autosave)).rejects.toThrow();

    await save(data, autosave);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('saveDraftOf after a crash', () => {
  it('sends nothing once saves are halted, neither an autosave nor Save', async () => {
    vi.resetModules();
    const adapter = await import('./save-workflow-draft');
    const save = adapter.saveDraftOf(WORKFLOW);
    adapter.haltSaves();

    await expect(save(data, autosave)).rejects.toThrow();
    await expect(save(data, { isAutoSave: false })).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
