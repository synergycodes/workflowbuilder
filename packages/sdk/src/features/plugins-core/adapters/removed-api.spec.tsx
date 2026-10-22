import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../../../node/node-data';
import { resetWorkflowStore } from '../../../store/store';
import { ProjectSelection } from '../../app-bar/components/project-selection/project-selection';
import '../../i18n/index';
import { PropertiesBar } from '../../properties-bar/components/properties-bar/properties-bar';
import { renderInRoot } from '../../ui-extensions/test-utils';
import { hasRegisteredComponentDecorator, registerComponentDecorator } from './adapter-components';
import { registerFunctionDecorator } from './adapter-functions';

const NAME = 'removed-api-spec';

const node = {
  id: 'node-1',
  type: 'node',
  position: { x: 0, y: 0 },
  data: { type: 'action', icon: 'Play', properties: { label: 'Review' } },
} as unknown as WorkflowBuilderNode;

function silenceWarnings() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {});
}

function expectOneWarningNaming(warn: ReturnType<typeof silenceWarnings>, ...names: string[]) {
  expect(warn).toHaveBeenCalledTimes(1);
  for (const name of names) expect(warn).toHaveBeenCalledWith(expect.stringContaining(name));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('registerComponentDecorator with a slot 4.0 removed', () => {
  it.each([
    ['OptionalAppBarTools', ['AppBarToolsContent', 'builtInControls={{ save: false }}']],
    ['OptionalAppBarControls', ['AppBarControlsContent']],
    ['OptionalFooterContent', ['PaletteFooterContent']],
    [
      'ProjectSelection',
      ['ProjectMenuItem', 'builtInControls', 'useWorkflowBuilderState', 'useWorkflowBuilderActions'],
    ],
  ])('%s warns naming the replacement and registers nothing', (slot, replacements) => {
    const warn = silenceWarnings();

    registerComponentDecorator(slot, { name: NAME, content: () => null });

    expectOneWarningNaming(warn, `'${slot}'`, ...replacements);
    expect(hasRegisteredComponentDecorator(slot, NAME)).toBeFalsy();
  });
});

describe('registerFunctionDecorator with getControlsDotsItems', () => {
  it('warns naming AppBarMenuItem and builtInControls', () => {
    const warn = silenceWarnings();

    registerFunctionDecorator('getControlsDotsItems', { name: NAME, callback: () => {} });

    expectOneWarningNaming(warn, "'getControlsDotsItems'", 'AppBarMenuItem', 'builtInControls');
  });
});

describe('a prop 4.0 removed reaching its component', () => {
  afterEach(() => {
    // Registering the name again replaces the entry, and an entry without `modifyProps` changes nothing.
    registerComponentDecorator('PropertiesBar', { name: NAME });
  });

  it('onMenuHeaderClick injected through modifyProps warns once, naming PropertiesPanelMenuItem, and adds no menu button', () => {
    const warn = silenceWarnings();
    registerComponentDecorator('PropertiesBar', {
      name: NAME,
      modifyProps: (props: object) => ({ ...props, onMenuHeaderClick: vi.fn() }),
    });
    resetWorkflowStore();

    renderInRoot(
      <PropertiesBar
        selection={{ node, edge: null }}
        selectedTab="custom"
        onTabChange={vi.fn()}
        headerLabel="Properties"
        deleteNodeLabel="Delete node"
        deleteEdgeLabel="Delete edge"
        tabs={[{ label: 'Custom', value: 'custom', components: [] }]}
      />,
    );

    expectOneWarningNaming(warn, 'onMenuHeaderClick', 'PropertiesBar', 'PropertiesPanelMenuItem');
    expect(screen.getByText('Review')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });

  it('onDuplicateClick on ProjectSelection warns once, naming ProjectMenuItem, and adds no menu item', () => {
    const warn = silenceWarnings();
    resetWorkflowStore();

    renderInRoot(<ProjectSelection {...{ onDuplicateClick: vi.fn() }} />, { builtInControls: { settings: false } });

    expectOneWarningNaming(warn, 'onDuplicateClick', 'ProjectSelection', 'ProjectMenuItem');
    expect(screen.queryByRole('button', { name: 'Project actions' })).toBeNull();
  });
});
