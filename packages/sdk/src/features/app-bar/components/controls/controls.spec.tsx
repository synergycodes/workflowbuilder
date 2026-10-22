import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import '../../../i18n/index';
import { useModalStore } from '../../../modals/stores/use-modal-store';
import type { BuiltInControls } from '../../../ui-extensions/built-in-controls';
import { BuiltInControlsProvider, EMPTY_CONTROLS } from '../../../ui-extensions/built-in-controls-context';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { Controls } from './controls';

// A plain `BuiltInControlsProvider` wrapper, not `renderInRoot`: its own `rerender` keeps
// the `builtInControls` value it was first called with, so changing it needs a real
// provider rerender instead (same pattern as `root-shell.spec.tsx`'s `rerenderRoot`).
function renderControls(builtInControls?: BuiltInControls) {
  const tree = (controls?: BuiltInControls) => (
    <StrictMode>
      <BuiltInControlsProvider value={controls ?? EMPTY_CONTROLS}>
        <Controls />
      </BuiltInControlsProvider>
    </StrictMode>
  );
  const view = render(tree(builtInControls));
  return { ...view, rerenderControls: (next?: BuiltInControls) => view.rerender(tree(next)) };
}

// Calls the actions directly, bypassing the dots menu.
function ImportExportButtons() {
  const { openImport, openExport } = useWorkflowBuilderActions();
  return (
    <>
      <button type="button" onClick={openImport}>
        Import now
      </button>
      <button type="button" onClick={openExport}>
        Export now
      </button>
    </>
  );
}

function openedModalTitle() {
  const { isOpen, modal } = useModalStore.getState();
  return isOpen ? modal?.title : undefined;
}

function openDotsMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
}

// Base UI's switch builds a PointerEvent on click, which jsdom does not define.
if (!('PointerEvent' in globalThis)) {
  vi.stubGlobal('PointerEvent', MouseEvent);
}

beforeEach(() => {
  resetWorkflowStore();
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('Controls builtInControls', () => {
  it('languageSelector:false hides the language menu; true (the default) shows it', () => {
    const { unmount } = renderInRoot(<Controls />, { builtInControls: { languageSelector: false } });
    expect(screen.queryByRole('button', { name: /Change Language/i })).toBeNull();
    unmount();

    renderInRoot(<Controls />, { builtInControls: { languageSelector: true } });
    expect(screen.getByRole('button', { name: /Change Language/i })).not.toBeNull();
  });

  it('readOnlyToggle:false hides the read-only switch; true (the default) shows it', () => {
    // themeToggle is also an unlabeled `role="switch"`, so it is turned off here to
    // isolate the control under test.
    const { container, unmount } = renderInRoot(<Controls />, {
      builtInControls: { readOnlyToggle: false, themeToggle: false },
    });
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(0);
    unmount();

    const { container: shown } = renderInRoot(<Controls />, {
      builtInControls: { readOnlyToggle: true, themeToggle: false },
    });
    const switches = shown.querySelectorAll('[role="switch"]');
    expect(switches).toHaveLength(1);

    // The one switch left is the read-only one: flipping it changes the store, not the theme.
    fireEvent.click(switches[0]!);
    expect(useStore.getState().isReadOnly).toBe(true);
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('themeToggle:false hides the dark-mode switch; true (the default) shows it', () => {
    const { container, unmount } = renderInRoot(<Controls />, {
      builtInControls: { themeToggle: false, readOnlyToggle: false },
    });
    expect(container.querySelectorAll('[role="switch"]')).toHaveLength(0);
    unmount();

    const { container: shown } = renderInRoot(<Controls />, {
      builtInControls: { themeToggle: true, readOnlyToggle: false },
    });
    const switches = shown.querySelectorAll('[role="switch"]');
    expect(switches).toHaveLength(1);

    // The one switch left is the theme one: flipping it changes the theme, not the store.
    fireEvent.click(switches[0]!);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(useStore.getState().isReadOnly).toBe(false);
  });

  it('export and import both false hide the dots menu button; either true shows it', () => {
    const { unmount } = renderInRoot(<Controls />, {
      builtInControls: { export: false, import: false },
    });
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    unmount();

    renderInRoot(<Controls />, { builtInControls: { export: true, import: false } });
    expect(screen.getByRole('button', { name: 'Menu' })).not.toBeNull();
  });

  it('export:false and import:false keep openImport and openExport working', () => {
    useModalStore.setState({ isOpen: false, modal: null });
    renderInRoot(
      <>
        <ImportExportButtons />
        <Controls />
      </>,
      { builtInControls: { export: false, import: false } },
    );
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();

    fireEvent.click(screen.getByText('Import now'));
    expect(openedModalTitle()).toBe(i18n.t('importExport.import'));

    useModalStore.setState({ isOpen: false, modal: null });
    fireEvent.click(screen.getByText('Export now'));
    expect(openedModalTitle()).toBe(i18n.t('importExport.export'));
  });

  it('export:false, import:true shows only the Import item in the dots menu', () => {
    renderInRoot(<Controls />, { builtInControls: { export: false, import: true } });

    openDotsMenu();
    expect(screen.queryByText('Export')).toBeNull();
    expect(screen.getByText('Import')).not.toBeNull();
  });

  it('a real rerender (no remount) from export:false,import:false to export:true,import:false grows the dots menu', () => {
    const { rerenderControls } = renderControls({ export: false, import: false });
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();

    rerenderControls({ export: true, import: false });

    expect(screen.getByRole('button', { name: 'Menu' })).not.toBeNull();
    openDotsMenu();
    expect(screen.getByText('Export')).not.toBeNull();
    expect(screen.queryByText('Import')).toBeNull();
  });
});
