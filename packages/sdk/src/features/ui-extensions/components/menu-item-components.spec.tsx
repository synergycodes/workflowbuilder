import { fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../../../node/node-data';
import { resetWorkflowStore } from '../../../store/store';
import { Controls } from '../../app-bar/components/controls/controls';
import { ProjectSelection } from '../../app-bar/components/project-selection/project-selection';
import '../../i18n/index';
import { PropertiesBar } from '../../properties-bar/components/properties-bar/properties-bar';
import { renderInRoot } from '../test-utils';
import { AppBarMenuItem } from './app-bar-menu-item';
import { ProjectMenuItem } from './project-menu-item';
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

describe('AppBarMenuItem', () => {
  it('appears after Export and Import behind a separator', () => {
    renderInRoot(
      <>
        <AppBarMenuItem label="Custom" />
        <Controls />
      </>,
      { builtInControls: { export: true, import: true } },
    );

    openMenu('Menu');

    expect(menuRows()).toEqual(['Export', 'Import', '---', 'Custom']);
  });

  it('with export and import hidden the registered item is the only item and there is no separator', () => {
    renderInRoot(
      <>
        <AppBarMenuItem label="Custom" />
        <Controls />
      </>,
      { builtInControls: { export: false, import: false } },
    );

    openMenu('Menu');

    expect(menuRows()).toEqual(['Custom']);
  });
});

describe('a menu with no items', () => {
  it('hides its trigger', () => {
    renderInRoot(<Controls />, { builtInControls: { export: false, import: false } });

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });
});

describe('ProjectMenuItem', () => {
  it('appears after Settings', () => {
    renderInRoot(
      <>
        <ProjectMenuItem label="Custom" />
        <ProjectSelection />
      </>,
    );

    openMenu('Project actions');

    expect(menuRows()).toEqual(['Settings', '---', 'Custom']);
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
          <AppBarMenuItem label="Custom" disabled={disabled} />
          <Controls />
        </>
      );
    }
    const { rerender } = renderInRoot(<Panel disabled={false} />, {
      builtInControls: { export: false, import: false },
    });

    openMenu('Menu');
    expect((screen.getByRole('menuitem', { name: 'Custom' }) as HTMLElement).dataset.disabled).toBeUndefined();

    rerender(<Panel disabled />);

    expect(menuRows()).toEqual(['Custom']);
    expect((screen.getByRole('menuitem', { name: 'Custom' }) as HTMLElement).dataset.disabled).not.toBeUndefined();
  });
});

describe('onMenuHeaderClick', () => {
  it('still fires when no items are registered', () => {
    const onMenuHeaderClick = vi.fn();
    renderInRoot(propertiesBarWithSelection({ onMenuHeaderClick }));

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

    expect(onMenuHeaderClick).toHaveBeenCalledTimes(1);
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

  it('shows no dots button for onMenuHeaderClick when there is no selection', () => {
    const onMenuHeaderClick = vi.fn();
    renderInRoot(propertiesBarWithSelection({ onMenuHeaderClick, selection: null }));

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });
});
