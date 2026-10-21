import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { resetWorkflowStore } from '../../../../store/store';
import type { OnSave } from '../../../../types/integration';
import '../../../i18n/index';
import { IntegrationContextWrapper } from '../../../integration/components/integration-variants/context/integration-context-wrapper';
import { useIntegrationStore } from '../../../integration/stores/use-integration-store';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { Toolbar } from './toolbar';

// Calls the action directly, bypassing the toolbar's own Save button.
function SaveNowButton() {
  const { save } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={() => void save()}>
      Save now
    </button>
  );
}

function renderToolbar(onSave: OnSave, save?: boolean) {
  resetWorkflowStore();
  // As after the initial load: saves are refused while the status is still 'disabled'.
  useIntegrationStore.setState({ savingStatus: 'waiting', lastSaveAttemptTimestamp: Date.now() });
  return renderInRoot(
    <IntegrationContextWrapper onSave={onSave}>
      <SaveNowButton />
      <Toolbar />
    </IntegrationContextWrapper>,
    { builtInControls: { save } },
  );
}

describe('Toolbar builtInControls', () => {
  it('save:false hides the Save button; true (the default) shows it', () => {
    const { unmount } = renderToolbar(
      vi.fn<OnSave>(async () => 'success'),
      false,
    );
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    unmount();

    renderToolbar(
      vi.fn<OnSave>(async () => 'success'),
      true,
    );
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeNull();
  });

  it('save:false keeps the save action working', () => {
    const onSave = vi.fn<OnSave>(async () => 'success');
    renderToolbar(onSave, false);

    fireEvent.click(screen.getByText('Save now'));

    expect(onSave).toHaveBeenCalledWith({ isAutoSave: false });
  });
});
