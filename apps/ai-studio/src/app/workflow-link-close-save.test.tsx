import { trackFutureChange, useChangesTrackerStore, useStore } from '@workflowbuilder/sdk';
import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIntegrationStore } from '../../../../packages/sdk/src/features/integration/stores/use-integration-store';
import { refundReviewFlow } from '../data/refund-review-flow';
import { resetExecution } from '../stores/use-execution-store';
import { jsonResponse } from '../test/json-response';
import { App } from './app';
import type { OpenedSource } from './open-from-url';

vi.setConfig({ testTimeout: 30_000 });

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';

// jsdom lays nothing out; browsers report every observed node's size right after it mounts.
class ReportingResizeObserver {
  constructor(private readonly callback: (entries: Array<{ target: Element }>, observer: unknown) => void) {}
  observe(target: Element) {
    setTimeout(() => this.callback([{ target }], this), 16);
  }
  unobserve() {}
  disconnect() {}
}

const sizeDescriptors = {
  offsetWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth'),
  offsetHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'),
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let fetchMock: ReturnType<typeof vi.fn>;
let container: HTMLDivElement;
let unmount: (() => void) | undefined;

const draftPatches = () =>
  fetchMock.mock.calls.filter(
    ([url, init]) => String(url).endsWith('/draft') && (init as RequestInit | undefined)?.method === 'PATCH',
  );

async function openWorkflowLink() {
  const opened: OpenedSource = {
    kind: 'workflow',
    workflowId: WORKFLOW,
    name: 'Refund desk',
    diagram: structuredClone({
      nodes: refundReviewFlow.value.diagram.nodes,
      edges: refundReviewFlow.value.diagram.edges,
    }),
  };
  const root = createRoot(container);
  root.render(
    <Suspense fallback={null}>
      <App opened={opened} />
    </Suspense>,
  );
  unmount = () => root.unmount();
  for (let tries = 0; tries < 100 && !container.querySelector('[aria-label="Save"]'); tries++) await wait(50);
  await wait(300);
}

async function leaveThePage() {
  globalThis.dispatchEvent(new Event('beforeunload'));
  await wait(200);
}

const clickFirstNode = async () => {
  container.querySelector('.react-flow__node')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await wait(100);
};

// Real timers: fake ones freeze Date.now, and the save rule compares change times with the open.
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  resetExecution();
  localStorage.clear();
  localStorage.setItem('ai-studio:disclaimer-acknowledged-v2', 'true');
  useChangesTrackerStore.setState({ lastChangeName: '', lastChangeParams: {}, lastChangeTimestamp: 0 });
  useIntegrationStore.setState({ savingStatus: 'disabled' });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 240 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 80 });
  vi.stubGlobal('ResizeObserver', ReportingResizeObserver);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  }));
  vi.stubGlobal(
    'DOMMatrixReadOnly',
    class {
      m22 = 1;
    },
  );
  fetchMock = vi.fn(async () => jsonResponse(200, { id: WORKFLOW, name: 'Refund desk' }));
  vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  container.remove();
  for (const [name, descriptor] of Object.entries(sizeDescriptors)) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
  }
  vi.unstubAllGlobals();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

describe('a workflow link on the real canvas, closed', () => {
  it('writes nothing after the canvas measured its nodes and a click selected one', async () => {
    await openWorkflowLink();
    await clickFirstNode();

    await leaveThePage();

    expect(useChangesTrackerStore.getState().lastChangeName).toBe('nodeDragChange');
    expect(draftPatches()).toHaveLength(0);
  });

  it('writes a property edit, even when a click followed it', async () => {
    await openWorkflowLink();
    trackFutureChange('dataUpdate');
    useStore.setState((state) => ({
      nodes: state.nodes.map((node, index) =>
        index === 0
          ? { ...node, data: { ...node.data, properties: { ...node.data.properties, label: 'Edited' } } }
          : node,
      ),
    }));
    await clickFirstNode();

    await leaveThePage();

    expect(draftPatches()).toHaveLength(1);
    expect(String((draftPatches()[0]![1] as RequestInit).body)).toContain('"label":"Edited"');
  });
});
