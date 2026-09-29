import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDiagramSourceStore } from '../../stores/use-diagram-source-store';
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

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

const saveButton = () => container.querySelector<HTMLButtonElement>('button[aria-label="Save the workflow draft"]');

function render(targetWorkflowId?: string) {
  useDiagramSourceStore.setState({ targetWorkflowId });
  act(() => root.render(<UrlModeAppBarTools />));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('UrlModeAppBarTools', () => {
  it('shows no Save button when nothing on the backend takes the diagram', () => {
    render();

    expect(container.innerHTML).toBe('');
  });

  it("shows the Save button for the link's workflow", () => {
    render(WORKFLOW);

    expect(saveButton()).not.toBeNull();
  });
});
