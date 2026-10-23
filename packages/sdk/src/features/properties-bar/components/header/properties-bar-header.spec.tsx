import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import type { WorkflowBuilderNode } from '../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import '../../../i18n/index';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { PropertiesBar } from '../properties-bar/properties-bar';
import { PropertiesBarHeader } from './properties-bar-header';

function renderHeader(propertiesPanelToggle?: boolean) {
  return renderInRoot(
    <PropertiesBarHeader
      header="Properties"
      name=""
      hasSelection
      isExpendable={false}
      isExpanded={false}
      onTogglePropertiesBar={vi.fn()}
    />,
    { builtInControls: { propertiesPanelToggle } },
  );
}

const node = {
  id: 'node-1',
  type: 'node',
  position: { x: 0, y: 0 },
  data: { type: 'action', icon: 'Play', properties: { label: 'Review' } },
} as unknown as WorkflowBuilderNode;

// Calls the action directly, bypassing the header's own toggle button.
function ExpandPropertiesPanelButton() {
  const { setPropertiesPanelOpen } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={() => setPropertiesPanelOpen(true)}>
      Expand
    </button>
  );
}

describe('PropertiesBarHeader builtInControls', () => {
  it('propertiesPanelToggle:false hides the open/close button; true (the default) shows it', () => {
    const { unmount } = renderHeader(false);
    expect(screen.queryByRole('button')).toBeNull();
    unmount();

    renderHeader(true);
    expect(screen.getByRole('button', { name: 'Open properties bar' })).not.toBeNull();
  });

  it('propertiesPanelToggle:false plus setPropertiesPanelOpen(true) expands the panel (one element selected)', () => {
    resetWorkflowStore();
    useStore.setState({ isPropertiesPanelOpen: false });

    const { container } = renderInRoot(
      <>
        <ExpandPropertiesPanelButton />
        <PropertiesBar
          selection={{ node, edge: null }}
          headerLabel="Properties"
          deleteNodeLabel="Delete node"
          deleteEdgeLabel="Delete edge"
          selectedTab="properties"
          onTabChange={vi.fn()}
        />
      </>,
      { builtInControls: { propertiesPanelToggle: false } },
    );

    // Collapsed: the toggle is gone and the panel has not been expanded yet (no separator rendered).
    expect(screen.queryByRole('button', { name: /properties ?bar/i })).toBeNull();
    expect(container.querySelectorAll('hr')).toHaveLength(0);

    fireEvent.click(screen.getByText('Expand'));

    // The hidden toggle never blocked the action: the panel is now expanded.
    expect(container.querySelectorAll('hr').length).toBeGreaterThan(0);
  });
});
