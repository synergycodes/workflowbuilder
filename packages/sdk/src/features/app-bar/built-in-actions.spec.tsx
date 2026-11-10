import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderActions } from '../../hooks/use-workflow-builder-actions';
import { resetWorkflowStore, useStore } from '../../store/store';
import '../i18n/index';
import { renderInRoot } from '../ui-extensions/test-utils';
import { Controls } from './components/controls/controls';
import { ProjectSelection } from './components/project-selection/project-selection';
import { Toolbar } from './components/toolbar/toolbar';

const actions = vi.hoisted(() => ({}) as Record<keyof WorkflowBuilderActions, ReturnType<typeof vi.fn>>);
vi.mock('../../hooks/use-workflow-builder-actions', () => ({
  useWorkflowBuilderActions: () => actions,
}));

const ACTION_NAMES: (keyof WorkflowBuilderActions)[] = [
  'save',
  'openSettings',
  'openImport',
  'openExport',
  'setReadOnly',
  'setTheme',
  'setLanguage',
  'setWorkflowName',
];

function renderHeader() {
  return renderInRoot(
    <>
      <Toolbar />
      <ProjectSelection />
      <Controls />
    </>,
  );
}

function pickFromWorkflowMenu(label: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Project actions' }));
  fireEvent.click(screen.getByRole('menuitem', { name: label }));
}

beforeEach(() => {
  resetWorkflowStore();
  useStore.setState({ workflowName: 'My Diagram' });
  localStorage.clear();
  for (const name of ACTION_NAMES)
    actions[name] = vi.fn(() => (name === 'save' ? Promise.resolve('success') : undefined));
});

describe('built-in editor header controls run their actions', () => {
  it('Save runs save', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(actions.save).toHaveBeenCalledOnce();
  });

  it.each([
    ['Export', 'openExport'],
    ['Import', 'openImport'],
    ['Settings', 'openSettings'],
  ] as const)('the workflow menu item %s runs %s', (label, action) => {
    renderHeader();

    pickFromWorkflowMenu(label);

    expect(actions[action]).toHaveBeenCalledOnce();
  });

  it('the read-only switch runs setReadOnly', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Read-only mode' }));

    expect(actions.setReadOnly).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('the theme switch runs setTheme', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));

    expect(actions.setTheme).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('renaming the title runs setWorkflowName', () => {
    renderHeader();

    fireEvent.click(screen.getByText('My Diagram'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Renamed' } });

    expect(actions.setWorkflowName).toHaveBeenCalledExactlyOnceWith('Renamed');
  });
});
