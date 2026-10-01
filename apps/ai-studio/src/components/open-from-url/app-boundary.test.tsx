import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenError } from '../../app/open-error';
import { AppBoundary } from './app-boundary';

const saves = vi.hoisted(() => ({ halt: vi.fn() }));
vi.mock('../../adapters/save-workflow-draft', () => ({ haltSaves: saves.halt }));

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function atAddress(href: string) {
  const assign = vi.fn();
  vi.stubGlobal('location', { href, pathname: new URL(href).pathname, assign });
  return assign;
}

function renderThrowing(error: unknown) {
  function Throwing(): never {
    throw error;
  }
  act(() =>
    root.render(
      <AppBoundary>
        <Throwing />
      </AppBoundary>,
    ),
  );
}

const text = () => container.textContent ?? '';
const button = () => container.querySelector('button')!;
const clickExit = () => act(() => button().click());

beforeEach(() => {
  saves.halt.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AppBoundary', () => {
  it('a crash while drawing offers the local draft, even under a workflow link the draft may have caused', () => {
    const assign = atAddress(`http://localhost/?workflowId=${WORKFLOW}`);
    renderThrowing(new TypeError("Cannot read properties of undefined (reading 'x')"));

    expect(text()).toContain('The diagram could not be drawn.');
    expect(button().textContent).toBe('Open local draft');
    clickExit();
    expect(assign).toHaveBeenCalledWith('/');
  });

  // The editor's pending autosave fires after it unmounted, with the graph that would not draw.
  it('stops the editor saving once it caught a crash', () => {
    atAddress(`http://localhost/?workflowId=${WORKFLOW}`);
    renderThrowing(new TypeError("Cannot read properties of undefined (reading 'x')"));

    expect(saves.halt).toHaveBeenCalled();
  });

  it('a run that would not open under a workflow link offers that workflow, without the run in the address', () => {
    const assign = atAddress(`http://localhost/?workflowId=${WORKFLOW}&executionId=${RUN}`);
    renderThrowing(new OpenError('run', 'the server answered 404'));

    expect(text()).toContain('The run in the link could not be opened: the server answered 404.');
    expect(text()).toContain('Reload the page to try the link again.');
    expect(button().textContent).toBe('Open the workflow');
    clickExit();
    expect(assign).toHaveBeenCalledWith(`http://localhost/?workflowId=${WORKFLOW}`);
  });

  it('a run that would not open on its own offers the local draft', () => {
    const assign = atAddress(`http://localhost/?executionId=${RUN}`);
    renderThrowing(new OpenError('run', 'the server did not answer'));

    expect(button().textContent).toBe('Open local draft');
    clickExit();
    expect(assign).toHaveBeenCalledWith('/');
  });

  it('a workflow that would not open offers the local draft, never itself', () => {
    const assign = atAddress(`http://localhost/?workflowId=${WORKFLOW}`);
    renderThrowing(new OpenError('workflow', 'the server answered 404'));

    expect(button().textContent).toBe('Open local draft');
    clickExit();
    expect(assign).toHaveBeenCalledWith('/');
  });
});
