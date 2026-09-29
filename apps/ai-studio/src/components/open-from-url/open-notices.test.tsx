import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addNotice, useDiagramSourceStore } from '../../stores/use-diagram-source-store';
import { OpenNotices } from './open-notices';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  useDiagramSourceStore.setState({ targetWorkflowId: undefined, notices: [] });
  container = document.createElement('div');
  root = createRoot(container);
  act(() => root.render(<OpenNotices />));
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});

const shown = () => [...container.querySelectorAll('[role="status"]')].map((notice) => notice.textContent);

describe('OpenNotices', () => {
  it('shows each notice until it is closed', () => {
    act(() => {
      addNotice('The run in the link could not be opened.');
      addNotice('Some nodes use types this app does not know.');
    });
    expect(shown()).toHaveLength(2);

    act(() => container.querySelector<HTMLButtonElement>('[role="status"] button')!.click());

    expect(shown()).toHaveLength(1);
    expect(shown()[0]).toContain('Some nodes');
  });

  it('lets a success notice go by itself', () => {
    vi.useFakeTimers();
    act(() => addNotice('The workflow draft is saved.', 'success'));
    expect(shown()).toHaveLength(1);

    act(() => vi.advanceTimersByTime(3000));

    expect(shown()).toHaveLength(0);
  });
});
