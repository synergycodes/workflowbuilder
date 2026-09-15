import { ReactFlowProvider } from '@xyflow/react';
import { type ReactNode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultDecisionRequest } from './default-properties-data';
import { HumanDecisionNodeTemplate } from './human-decision-template';

// The slot is observed through a marker element; the real one renders its children unchanged.
vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return {
    ...actual,
    Icon: () => null,
    OptionalNodeContent: ({ nodeId, children }: { nodeId: string; children?: ReactNode }) => (
      <div data-optional-node-content={nodeId}>{children}</div>
    ),
  };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const data = {
  type: 'ai-studio/human-decision',
  icon: 'UserCheck' as const,
  properties: { label: 'Human decision', description: '', decisionRequest: defaultDecisionRequest },
};

function handles(container: HTMLElement, type: 'source' | 'target') {
  return [...container.querySelectorAll<HTMLElement>(`.react-flow__handle.${type}`)];
}

describe('HumanDecisionNodeTemplate', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(element: ReactNode) {
    act(() => root.render(<ReactFlowProvider>{element}</ReactFlowProvider>));
  }

  it('mounts one source handle per action, with the action port as the handle id', () => {
    render(
      <HumanDecisionNodeTemplate id="human-1" icon="UserCheck" label="Human decision" description="" data={data} />,
    );

    expect(handles(container, 'source').map((handle) => handle.dataset['handleid'])).toEqual([
      'source:inner:approved',
      'source:inner:rejected',
    ]);
    expect(container.textContent).toContain('Approve');
    expect(container.textContent).toContain('Reject');
  });

  it('derives the handles from the request: labels, ports and count come from its actions', () => {
    const request = {
      version: 1,
      actions: [
        { name: 'ship', label: 'Ship it', effect: 'resume', port: 'source:inner:shipped' },
        { name: 'escalate', label: 'Escalate', effect: 'resume', port: 'source:inner:escalated' },
        { name: 'send-back', label: 'Send back', effect: 'reject', port: 'source:inner:sent-back' },
        { name: 'ask-again', label: 'Ask again', effect: 'rerun-source', maxIterations: 3 },
      ],
      schema: { type: 'object', properties: {} },
    };

    render(
      <HumanDecisionNodeTemplate
        id="human-1"
        icon="UserCheck"
        label="Human decision"
        description=""
        data={{ ...data, properties: { ...data.properties, decisionRequest: request } }}
      />,
    );

    expect(handles(container, 'source').map((handle) => handle.dataset['handleid'])).toEqual([
      'source:inner:shipped',
      'source:inner:escalated',
      'source:inner:sent-back',
    ]);
    for (const label of ['Ship it', 'Escalate', 'Send back']) {
      expect(container.textContent).toContain(label);
    }
    expect(container.textContent).not.toContain('Ask again');
    expect(container.textContent).not.toContain('Approve');
  });

  it.each([
    ['no request', undefined],
    ['actions that are not a list', { version: 1, actions: 'nope' }],
    ['a request that is not an object', 'nope'],
  ])('renders the header and only the target handle with %s', (_case, decisionRequest) => {
    render(
      <HumanDecisionNodeTemplate
        id="human-1"
        icon="UserCheck"
        label="Human decision"
        description=""
        isValid={false}
        data={{ ...data, properties: { ...data.properties, decisionRequest } }}
      />,
    );

    expect(container.textContent).toContain('Human decision');
    expect(container.textContent).not.toContain('Decision');
    expect(handles(container, 'source')).toHaveLength(0);
    expect(handles(container, 'target').map((handle) => handle.dataset['handleid'])).toEqual(['target']);
  });

  it('skips actions without a port and shows the port when an action has no label', () => {
    const request = {
      version: 1,
      actions: [{ name: 'go', port: 'source:inner:go' }, { name: 'stay', label: 'No port here' }, null, 'garbage'],
    };

    render(
      <HumanDecisionNodeTemplate
        id="human-1"
        icon="UserCheck"
        label="Human decision"
        description=""
        data={{ ...data, properties: { ...data.properties, decisionRequest: request } }}
      />,
    );

    expect(handles(container, 'source').map((handle) => handle.dataset['handleid'])).toEqual(['source:inner:go']);
    expect(container.textContent).toContain('source:inner:go');
    expect(container.textContent).not.toContain('No port here');
  });

  it('mounts one target handle', () => {
    render(
      <HumanDecisionNodeTemplate id="human-1" icon="UserCheck" label="Human decision" description="" data={data} />,
    );

    expect(handles(container, 'target').map((handle) => handle.dataset['handleid'])).toEqual(['target']);
  });

  it('renders the actions inside the OptionalNodeContent slot, where the execution markers mount', () => {
    render(
      <HumanDecisionNodeTemplate id="human-1" icon="UserCheck" label="Human decision" description="" data={data} />,
    );

    const slot = container.querySelector('[data-optional-node-content="human-1"]');
    expect(slot).not.toBeNull();
    expect(slot?.querySelectorAll('.react-flow__handle.source')).toHaveLength(2);
  });

  it('follows the layout direction: handles hang below and above in a top-down diagram', () => {
    render(
      <HumanDecisionNodeTemplate
        id="human-1"
        icon="UserCheck"
        label="Human decision"
        description=""
        data={data}
        layoutDirection="DOWN"
      />,
    );

    expect(handles(container, 'source').map((handle) => handle.dataset['handlepos'])).toEqual(['bottom', 'bottom']);
    expect(handles(container, 'target').map((handle) => handle.dataset['handlepos'])).toEqual(['top']);
  });

  it('shows only the header in the palette preview: no handles, no slot', () => {
    render(
      <HumanDecisionNodeTemplate id="" icon="UserCheck" label="Human decision" description="" showHandles={false} />,
    );

    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(0);
    expect(container.querySelector('[data-optional-node-content]')).toBeNull();
    expect(container.textContent).toContain('Human decision');
  });
});
