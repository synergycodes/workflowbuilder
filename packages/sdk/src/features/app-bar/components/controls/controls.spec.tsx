import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetWorkflowStore } from '../../../../store/store';
import '../../../i18n/index';
import { registerComponentDecorator } from '../../../plugins-core/adapters/adapter-components';
import type { BuiltInControls } from '../../../ui-extensions/built-in-controls';
import { BuiltInControlsProvider, EMPTY_CONTROLS } from '../../../ui-extensions/built-in-controls-context';
import { AppBarMenuItem } from '../../../ui-extensions/components/app-bar-menu-item';
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

function openDotsMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
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
    expect(shown.querySelectorAll('[role="switch"]')).toHaveLength(1);
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
    expect(shown.querySelectorAll('[role="switch"]')).toHaveLength(1);
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

describe('Controls registered menu items', () => {
  const PRODUCER = 'controls-spec-menu-item-producer';

  afterEach(() => {
    // Registering a name again replaces the entry, and an entry without content renders nothing.
    registerComponentDecorator('OptionalAppBarControls', { name: PRODUCER });
  });

  it('an OptionalAppBarControls decorator rendering an AppBarMenuItem with an inline icon and onClick renders a bounded number of times', () => {
    let producerRenders = 0;
    function MenuItemProducer() {
      producerRenders += 1;
      return <AppBarMenuItem label="From a decorator" icon={<span />} onClick={() => {}} />;
    }
    registerComponentDecorator('OptionalAppBarControls', { name: PRODUCER, content: MenuItemProducer });

    expect(() => renderInRoot(<Controls />)).not.toThrow();

    expect(producerRenders).toBeLessThanOrEqual(2);
    openDotsMenu();
    expect(screen.getByText('From a decorator')).not.toBeNull();
  });
});
