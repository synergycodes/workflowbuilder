import { fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../../../node/node-data';
import { resetWorkflowStore } from '../../../store/store';
import { ProjectSelection } from '../../app-bar/components/project-selection/project-selection';
import '../../i18n/index';
import { PropertiesBar } from '../../properties-bar/components/properties-bar/properties-bar';
import { renderInRoot } from '../test-utils';
import { WorkflowMenuItem } from './project-menu-item';
import { PropertiesPanelMenuItem } from './properties-panel-menu-item';

const node = {
  id: 'node-1',
  type: 'node',
  position: { x: 0, y: 0 },
  data: { type: 'action', icon: 'Play', properties: { label: 'Review' } },
} as unknown as WorkflowBuilderNode;

function menuRows(): string[] {
  return Array.from(document.querySelectorAll('[role="menuitem"], [role="menuitemradio"], hr'), (element) =>
    element.tagName === 'HR' ? '---' : (element.textContent ?? ''),
  );
}

function openMenu(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

function propertiesBarWithSelection(extra: Partial<ComponentProps<typeof PropertiesBar>> = {}) {
  return (
    <PropertiesBar
      selection={{ node, edge: null }}
      headerLabel="Properties"
      deleteNodeLabel="Delete node"
      deleteEdgeLabel="Delete edge"
      selectedTab="properties"
      onTabChange={vi.fn()}
      {...extra}
    />
  );
}

beforeEach(() => {
  resetWorkflowStore();
});

describe('WorkflowMenuItem', () => {
  it('appears after the built-in items behind a separator', () => {
    renderInRoot(
      <>
        <WorkflowMenuItem label="Custom" />
        <ProjectSelection />
      </>,
    );

    openMenu('Project actions');

    expect(menuRows()).toEqual(['Export', 'Import', '---', 'Settings', '---', 'Custom']);
  });

  it('with every built-in item hidden the registered item is the only item and there is no separator', () => {
    renderInRoot(
      <>
        <WorkflowMenuItem label="Custom" />
        <ProjectSelection />
      </>,
      { builtInControls: { export: false, import: false, settings: false } },
    );

    openMenu('Project actions');

    expect(menuRows()).toEqual(['Custom']);
  });
});

describe('a menu with no items', () => {
  it('hides its trigger', () => {
    renderInRoot(<ProjectSelection />, { builtInControls: { export: false, import: false, settings: false } });

    expect(screen.queryByRole('button', { name: 'Project actions' })).toBeNull();
  });
});

describe('PropertiesPanelMenuItem', () => {
  function Panel({ withForm }: { withForm: boolean }) {
    return (
      <>
        {withForm && <PropertiesPanelMenuItem label="Approve" />}
        {propertiesBarWithSelection()}
      </>
    );
  }

  it('from the node form appears in the panel menu and disappears with the form', () => {
    const { rerender } = renderInRoot(<Panel withForm />);

    openMenu('Menu');
    expect(screen.getByRole('menuitem', { name: 'Approve' })).not.toBeNull();

    rerender(<Panel withForm={false} />);

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });
});

describe('prop change other than the label', () => {
  it('updates the item in place', () => {
    function Panel({ disabled }: { disabled: boolean }) {
      return (
        <>
          <WorkflowMenuItem label="Custom" disabled={disabled} />
          <ProjectSelection />
        </>
      );
    }
    const { rerender } = renderInRoot(<Panel disabled={false} />, {
      builtInControls: { export: false, import: false, settings: false },
    });

    openMenu('Project actions');
    expect((screen.getByRole('menuitem', { name: 'Custom' }) as HTMLElement).dataset.disabled).toBeUndefined();

    rerender(<Panel disabled />);

    expect(menuRows()).toEqual(['Custom']);
    expect((screen.getByRole('menuitem', { name: 'Custom' }) as HTMLElement).dataset.disabled).not.toBeUndefined();
  });
});

describe('the properties panel while collapsed', () => {
  it('shows no menu trigger for a registered item when there is no selection', () => {
    renderInRoot(
      <>
        <PropertiesPanelMenuItem label="Approve" />
        {propertiesBarWithSelection({ selection: null })}
      </>,
    );

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });

  it('shows no menu trigger for a registered item once the panel is closed with a selection', () => {
    renderInRoot(
      <>
        <PropertiesPanelMenuItem label="Approve" />
        {propertiesBarWithSelection()}
      </>,
    );
    expect(screen.getByRole('button', { name: 'Menu' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close properties bar' }));

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });
});
