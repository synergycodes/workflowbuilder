import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addNotice, useDiagramSourceStore } from '../../stores/use-diagram-source-store';
import { OpenNotices } from './open-notices';

const snackbar = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('@workflowbuilder/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@workflowbuilder/sdk')>()),
  showSnackbar: snackbar.show,
}));

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

const mount = () =>
  act(() =>
    root.render(
      <StrictMode>
        <OpenNotices />
      </StrictMode>,
    ),
  );

const shownTitles = () => snackbar.show.mock.calls.map(([options]) => (options as { title: string }).title);

beforeEach(() => {
  snackbar.show.mockClear();
  useDiagramSourceStore.setState({ notices: [] });
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
});

describe('OpenNotices', () => {
  it('shows the notices raised before the editor mounted in its snackbars, once each and in order', () => {
    addNotice('The run could not be opened.');
    addNotice('Some nodes use types this app does not know.');

    mount();

    expect(shownTitles()).toEqual(['The run could not be opened.', 'Some nodes use types this app does not know.']);
    expect(useDiagramSourceStore.getState().notices).toEqual([]);
  });

  it('shows a notice raised later at once', () => {
    mount();

    act(() => addNotice('The workflow draft could not be saved.', 'error'));

    expect(shownTitles()).toEqual(['The workflow draft could not be saved.']);
  });

  it('keeps a warning or an error until it is closed, and lets a success go by itself', () => {
    mount();

    act(() => {
      addNotice('The run did not start.', 'error');
      addNotice('The workflow draft is saved.', 'success');
    });

    expect(snackbar.show.mock.calls[0]![0]).toMatchObject({ variant: 'error', autoHideDuration: null });
    expect(snackbar.show.mock.calls[1]![0]).toMatchObject({ variant: 'success' });
    expect(snackbar.show.mock.calls[1]![0]).not.toHaveProperty('autoHideDuration');
  });

  // The editor's snackbars show nothing while it is not mounted, so a notice waits for the next one.
  it('holds a notice raised while no editor is on screen', () => {
    mount();
    act(() => root.unmount());
    root = createRoot(container);

    addNotice('The run could not be opened.');

    expect(snackbar.show).not.toHaveBeenCalled();
    expect(useDiagramSourceStore.getState().notices).toHaveLength(1);
  });
});
