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
    ['OptionalAppBarTools', ['EditorHeaderToolsContent', 'builtInControls={{ save: false }}']],
    ['OptionalAppBarControls', ['EditorHeaderControlsContent']],
    ['OptionalFooterContent', ['PaletteFooterContent']],
    [
      'ProjectSelection',
      ['WorkflowMenuItem', 'builtInControls', 'useWorkflowBuilderState', 'useWorkflowBuilderActions'],
    ],
  ])('%s warns naming the replacement and registers nothing', (slot, replacements) => {
    const warn = silenceWarnings();

    registerComponentDecorator(slot, { name: NAME, content: () => null });

    expectOneWarningNaming(warn, `'${slot}'`, ...replacements);
    expect(hasRegisteredComponentDecorator(slot, NAME)).toBeFalsy();
  });
});

describe('registerComponentDecorator with a slot 4.0 renamed', () => {
  it.each([
    ['PropertiesBar', 'PropertiesPanel', 'WorkflowBuilderPropertiesPanelProps'],
    ['DiagramContainer', 'Canvas', 'WorkflowBuilderCanvasProps'],
  ])('%s warns naming %s and its props type, and registers nothing', (slot, newSlot, propsType) => {
    const warn = silenceWarnings();

    registerComponentDecorator(slot, { name: NAME, modifyProps: (props: object) => props });

    expectOneWarningNaming(warn, `'${slot}'`, `'${newSlot}'`, propsType);
    expect(hasRegisteredComponentDecorator(slot, NAME)).toBeFalsy();
  });
});

describe('registerFunctionDecorator with getControlsDotsItems', () => {
  it('warns naming WorkflowMenuItem and builtInControls', () => {
    const warn = silenceWarnings();

    registerFunctionDecorator('getControlsDotsItems', { name: NAME, callback: () => {} });

    expectOneWarningNaming(warn, "'getControlsDotsItems'", 'WorkflowMenuItem', 'builtInControls');
  });
});

describe('a prop 4.0 removed reaching its component', () => {
  afterEach(() => {
    // Registering the name again replaces the entry, and an entry without `modifyProps` changes nothing.
    registerComponentDecorator('PropertiesPanel', { name: NAME });
  });

  it('onMenuHeaderClick injected through modifyProps warns once, naming PropertiesPanelMenuItem, and adds no menu button', () => {
    const warn = silenceWarnings();
    registerComponentDecorator('PropertiesPanel', {
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

    expectOneWarningNaming(warn, 'onMenuHeaderClick', 'PropertiesPanel', 'PropertiesPanelMenuItem');
    expect(screen.getByText('Review')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });

  it('onDuplicateClick on ProjectSelection warns once, naming WorkflowMenuItem, and adds no menu item', () => {
    const warn = silenceWarnings();
    resetWorkflowStore();

    renderInRoot(<ProjectSelection {...{ onDuplicateClick: vi.fn() }} />, {
      builtInControls: { export: false, import: false, settings: false },
    });

    expectOneWarningNaming(warn, 'onDuplicateClick', 'ProjectSelection', 'WorkflowMenuItem');
    expect(screen.queryByRole('button', { name: 'Project actions' })).toBeNull();
  });
});
