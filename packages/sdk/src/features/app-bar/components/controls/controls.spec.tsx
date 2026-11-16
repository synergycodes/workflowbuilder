import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetWorkflowStore, useStore } from '../../../../store/store';
import '../../../i18n/index';
import { EditorHeaderControlsContent } from '../../../ui-extensions/components/app-bar-controls-content';
import { renderInRoot } from '../../../ui-extensions/test-utils';

vi.mock('../publish-button/publish-button', () => ({
  PublishButton: () => <button>publish</button>,
}));

const { Controls } = await import('./controls');

beforeEach(() => {
  resetWorkflowStore();
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('Controls layout', () => {
  it('renders the More menu inside the controls segment, before Publish', () => {
    renderInRoot(<Controls />);

    const more = screen.getByRole('button', { name: 'Menu' });
    const publish = screen.getByRole('button', { name: 'publish' });
    expect(more.closest('[class*="controls-segment"]')).not.toBeNull();
    expect(publish.closest('[class*="controls-segment"]')).toBeNull();
    expect(more.compareDocumentPosition(publish) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps area content inside the controls segment, before More', () => {
    renderInRoot(
      <>
        <Controls />
        <EditorHeaderControlsContent>
          <button type="button">First</button>
        </EditorHeaderControlsContent>
        <EditorHeaderControlsContent place="after">
          <button type="button">Last</button>
        </EditorHeaderControlsContent>
      </>,
    );

    const more = screen.getByRole('button', { name: 'Menu' });
    for (const name of ['First', 'Last']) {
      const content = screen.getByRole('button', { name });
      expect(content.closest('[class*="controls-segment"]')).not.toBeNull();
      expect(content.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

describe('Controls builtInControls', () => {
  it('languageSelector:false hides the language menu; true (the default) shows it', () => {
    const { unmount } = renderInRoot(<Controls />, { builtInControls: { languageSelector: false } });
    expect(screen.queryByRole('button', { name: /Change Language/i })).toBeNull();
    unmount();

    renderInRoot(<Controls />, { builtInControls: { languageSelector: true } });
    expect(screen.getByRole('button', { name: /Change Language/i })).not.toBeNull();
  });

  it('readOnlyToggle:false hides the Edit / Read-only picker; true (the default) shows it', () => {
    const { unmount } = renderInRoot(<Controls />, { builtInControls: { readOnlyToggle: false } });
    expect(screen.queryByRole('button', { name: 'Read-only mode' })).toBeNull();
    unmount();

    renderInRoot(<Controls />, { builtInControls: { readOnlyToggle: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Read-only mode' }));
    expect(useStore.getState().isReadOnly).toBe(true);
  });

  it('themeToggle:false hides the Light / Dark picker; true (the default) shows it', () => {
    const { unmount } = renderInRoot(<Controls />, { builtInControls: { themeToggle: false } });
    expect(screen.queryByRole('button', { name: 'Dark theme' })).toBeNull();
    unmount();

    renderInRoot(<Controls />, { builtInControls: { themeToggle: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
