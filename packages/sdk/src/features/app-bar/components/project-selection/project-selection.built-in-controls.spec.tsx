import { fireEvent, screen } from '@testing-library/react';
import i18n from 'i18next';
import { describe, expect, it, vi } from 'vitest';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import '../../../i18n/index';
import { useModalStore } from '../../../modals/stores/use-modal-store';
import type { BuiltInControls } from '../../../ui-extensions/built-in-controls';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { ProjectSelection } from './project-selection';

afterEach(() => {
  localStorage.clear();
});

function resetWithDocumentName(name = 'My Diagram') {
  resetWorkflowStore();
  useStore.setState({ documentName: name });
}

function renderProjectSelection(builtInControls: BuiltInControls, onDuplicateClick?: () => void) {
  resetWithDocumentName();
  return renderInRoot(<ProjectSelection onDuplicateClick={onDuplicateClick} />, { builtInControls });
}

function openProjectMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Project actions' }));
}

// Calls the action directly, bypassing the title's own click-to-edit UI: the test for
// `documentRename: false` proves the action keeps working while that UI is hidden.
function RenameButton() {
  const { renameDocument } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={() => renameDocument('Renamed Elsewhere')}>
      Rename
    </button>
  );
}

// Calls the action directly, bypassing the project menu's Settings item.
function OpenSettingsButton() {
  const { openSettings } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={openSettings}>
      Open settings
    </button>
  );
}

describe('ProjectSelection builtInControls', () => {
  it('settings:false keeps openSettings working', () => {
    useModalStore.setState({ isOpen: false, modal: null });
    resetWithDocumentName();
    renderInRoot(
      <>
        <OpenSettingsButton />
        <ProjectSelection />
      </>,
      { builtInControls: { settings: false } },
    );
    expect(screen.queryByRole('button', { name: 'Project actions' })).toBeNull();

    fireEvent.click(screen.getByText('Open settings'));

    const { isOpen, modal } = useModalStore.getState();
    expect(isOpen).toBe(true);
    expect(modal?.title).toBe(i18n.t('workflowsSettings.modalTitle'));
  });

  it('settings:false hides the Settings item and the caret (nothing else in the menu)', () => {
    renderProjectSelection({ settings: false });

    // No onDuplicateClick either, so the menu has nothing left to show: the trigger itself is gone.
    expect(screen.queryByRole('button', { name: 'Project actions' })).toBeNull();
  });

  it('settings:true (the default) shows the caret and the Settings item', () => {
    renderProjectSelection({ settings: true });

    openProjectMenu();
    expect(screen.getByText('Settings')).not.toBeNull();
  });

  it('settings:false with onDuplicateClick still set keeps the caret, showing only Duplicate to Drafts', () => {
    renderProjectSelection({ settings: false }, vi.fn());

    openProjectMenu();
    expect(screen.queryByText('Settings')).toBeNull();
    expect(screen.getByText('Duplicate to Drafts')).not.toBeNull();
  });

  it('documentRename:false renders a plain, non-interactive title; renameDocument still works through the action', () => {
    resetWithDocumentName();
    const { unmount } = renderInRoot(
      <>
        <RenameButton />
        <ProjectSelection />
      </>,
      { builtInControls: { documentRename: false } },
    );

    const title = screen.getByText('My Diagram');
    expect(title.className).not.toMatch(/title-editable/);

    fireEvent.click(title);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('My Diagram')).not.toBeNull();

    fireEvent.click(screen.getByText('Rename'));
    expect(screen.getByText('Renamed Elsewhere')).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    unmount();

    resetWithDocumentName();
    renderInRoot(
      <>
        <RenameButton />
        <ProjectSelection />
      </>,
      { builtInControls: { documentRename: true } },
    );
    const editableTitle = screen.getByText('My Diagram');
    expect(editableTitle.className).toMatch(/title-editable/);

    fireEvent.click(editableTitle);
    expect(screen.getByRole('textbox')).not.toBeNull();
  });
});
