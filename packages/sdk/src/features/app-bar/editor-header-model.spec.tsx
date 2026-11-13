import { act, fireEvent, screen } from '@testing-library/react';
import { Button } from '@workflowbuilder/ui';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkflowBuilderActions } from '../../hooks/use-workflow-builder-actions';
import { useWorkflowBuilderState } from '../../hooks/use-workflow-builder-state';
import { resetWorkflowStore, useStore } from '../../store/store';
import '../i18n/index';
import type { BuiltInControls } from '../ui-extensions/built-in-controls';
import { EditorHeaderControlsContent } from '../ui-extensions/components/app-bar-controls-content';
import { EditorHeaderCleanUp } from '../ui-extensions/components/editor-header-clean-up';
import { EditorHeaderPublish } from '../ui-extensions/components/editor-header-publish';
import { EditorHeaderSaveAsPdf } from '../ui-extensions/components/editor-header-save-as-pdf';
import { EditorHeaderVersion } from '../ui-extensions/components/editor-header-version';
import { WorkflowMenuItem } from '../ui-extensions/components/project-menu-item';
import {
  SUPPLY_ROUTES,
  type SupplyRoute,
  removeSuppliesPlugin,
  renderWithSupplies,
} from '../ui-extensions/supplies-test-utils';
import { Controls } from './components/controls/controls';
import { ProjectSelection } from './components/project-selection/project-selection';
import { Toolbar } from './components/toolbar/toolbar';

vi.mock('@/features/changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

const CLEAN_UP = 'Clean up (horizontal)';
const SAVE_AS_PDF = 'Save as PDF';

type Handlers = {
  onCleanUp: ReturnType<typeof vi.fn<(direction: 'RIGHT' | 'DOWN') => void | Promise<void>>>;
  onSaveAsPdf: ReturnType<typeof vi.fn<() => void>>;
  onPublish: ReturnType<typeof vi.fn<() => void>>;
};

function handlers(): Handlers {
  return { onCleanUp: vi.fn(), onSaveAsPdf: vi.fn(), onPublish: vi.fn() };
}

function Supplies({ onCleanUp, onSaveAsPdf, onPublish, isDraft = true }: Handlers & { isDraft?: boolean }) {
  return (
    <>
      <EditorHeaderCleanUp onCleanUp={onCleanUp} />
      <EditorHeaderSaveAsPdf onSaveAsPdf={onSaveAsPdf} />
      <EditorHeaderVersion number={7} isDraft={isDraft} />
      <EditorHeaderPublish onPublish={onPublish} />
    </>
  );
}

function renderHeader({
  supplies,
  via,
  builtInControls,
  extra,
}: {
  supplies?: ReactNode;
  via?: SupplyRoute;
  builtInControls?: BuiltInControls;
  extra?: ReactNode;
}) {
  const captured: { actions: ReturnType<typeof useWorkflowBuilderActions> | null } = { actions: null };
  function ActionsProbe() {
    captured.actions = useWorkflowBuilderActions();
    return null;
  }

  const view = renderWithSupplies(
    <>
      <ActionsProbe />
      <Toolbar />
      <ProjectSelection />
      <Controls />
    </>,
    supplies,
    { via, builtInControls, after: extra },
  );

  return { ...view, actions: () => captured.actions! };
}

function workflowMenuLabels(): string[] {
  fireEvent.click(screen.getByRole('button', { name: 'Project actions' }));
  return screen.getAllByRole('menuitem').map((item) => item.textContent ?? '');
}

// Read like menu-item-components.spec: Base UI keeps a just-opened popup out of the accessibility tree.
function menuItemLabels(): string[] {
  return Array.from(document.querySelectorAll('[role^="menuitem"]'), (item) => item.textContent ?? '');
}

async function moreMenuLabels(): Promise<string[]> {
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  await act(async () => {});
  return menuItemLabels();
}

function closeMenus() {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
}

beforeEach(() => {
  resetWorkflowStore();
  useStore.setState({ nodes: [{ id: 'a', position: { x: 0, y: 0 }, data: {} }] as never, workflowName: 'Flow' });
  localStorage.clear();
});

afterEach(() => {
  removeSuppliesPlugin();
  vi.restoreAllMocks();
});

describe.each(SUPPLY_ROUTES)('editor header with supplies from the %s', (via) => {
  it('shows no Clean up, Save as PDF, version or Publish before anything is supplied', () => {
    renderHeader({ via });

    expect(screen.queryByRole('button', { name: CLEAN_UP })).toBeNull();
    expect(screen.queryByText('Draft v7')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish v7' })).toBeNull();
    expect(workflowMenuLabels()).not.toContain(SAVE_AS_PDF);
  });

  it('shows each supplied control and runs what was supplied', async () => {
    const supplied = handlers();
    renderHeader({ via, supplies: <Supplies {...supplied} /> });

    expect(screen.getByText('Draft v7')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: CLEAN_UP })));
    fireEvent.click(screen.getByRole('button', { name: 'Publish v7' }));
    expect(workflowMenuLabels()).toContain(SAVE_AS_PDF);
    fireEvent.click(screen.getByRole('menuitem', { name: SAVE_AS_PDF }));

    expect(supplied.onCleanUp).toHaveBeenCalledWith('RIGHT');
    expect(supplied.onPublish).toHaveBeenCalledOnce();
    expect(supplied.onSaveAsPdf).toHaveBeenCalledOnce();
  });

  it.each([
    ['cleanUp', () => screen.queryByRole('button', { name: CLEAN_UP })],
    ['version', () => screen.queryByText('Draft v7')],
    ['publish', () => screen.queryByRole('button', { name: 'Publish v7' })],
  ] as const)('%s:false hides only that control', (key, control) => {
    renderHeader({ via, supplies: <Supplies {...handlers()} />, builtInControls: { [key]: false } });

    expect(control()).toBeNull();
    expect(screen.getByRole('button', { name: 'Project actions' })).toBeTruthy();
  });

  it('hidden controls keep their actions working', async () => {
    const supplied = handlers();
    const view = renderHeader({
      via,
      supplies: <Supplies {...supplied} />,
      builtInControls: { cleanUp: false, saveAsPdf: false, publish: false },
    });
    expect(workflowMenuLabels()).not.toContain(SAVE_AS_PDF);

    await act(() => view.actions().cleanUp());
    view.actions().saveAsPdf();
    view.actions().publish();

    expect(supplied.onCleanUp).toHaveBeenCalledOnce();
    expect(supplied.onSaveAsPdf).toHaveBeenCalledOnce();
    expect(supplied.onPublish).toHaveBeenCalledOnce();
  });
});

describe('editor header ⋮', () => {
  it('collects Clean up and the theme, and respects the cleanUp key', async () => {
    const { unmount } = renderHeader({ supplies: <Supplies {...handlers()} /> });
    expect(await moreMenuLabels()).toEqual(['Clean up diagram', 'Arrange horizontally', 'Arrange vertically']);
    closeMenus();
    unmount();

    renderHeader({ supplies: <Supplies {...handlers()} />, builtInControls: { cleanUp: false } });
    expect(await moreMenuLabels()).toEqual(['Light theme', 'Dark theme']);
  });

  it('disappears when every control it would hold is hidden', () => {
    renderHeader({ supplies: <Supplies {...handlers()} />, builtInControls: { cleanUp: false, themeToggle: false } });

    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });

  it('never holds own content or own menu items', async () => {
    renderHeader({
      supplies: <Supplies {...handlers()} />,
      extra: (
        <>
          <EditorHeaderControlsContent>
            <button type="button">Share</button>
          </EditorHeaderControlsContent>
          <WorkflowMenuItem label="Duplicate" />
        </>
      ),
    });

    const labels = await moreMenuLabels();
    expect(labels).toContain('Clean up diagram');
    expect(labels).not.toContain('Share');
    expect(labels).not.toContain('Duplicate');
    closeMenus();
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
    expect(workflowMenuLabels()).toContain('Duplicate');
  });
});

describe('version chip', () => {
  it('shows on an empty canvas', () => {
    useStore.setState({ nodes: [] });
    renderHeader({ supplies: <EditorHeaderVersion number={3} isDraft={false} /> });

    expect(screen.getByText('v3')).toBeTruthy();
  });
});

function RebuiltControls() {
  const { cleanUp, publish } = useWorkflowBuilderActions();
  const { availableActions, isCanvasEmpty, isReadOnly, isCleanUpPending, version } = useWorkflowBuilderState();

  return (
    <EditorHeaderControlsContent>
      {availableActions.cleanUp && (
        <Button
          disabled={isCanvasEmpty || isReadOnly}
          aria-busy={isCleanUpPending}
          aria-label="Tidy"
          onClick={() => void cleanUp()}
        >
          Tidy
        </Button>
      )}
      {availableActions.publish && (
        <Button disabled={!version?.isDraft} onClick={publish}>
          Ship
        </Button>
      )}
    </EditorHeaderControlsContent>
  );
}

type Scenario = { name: string; isDraft?: boolean; setUp?: () => void; pendingCleanUp?: boolean };

const SCENARIOS: Scenario[] = [
  { name: 'an editable draft' },
  { name: 'a published version', isDraft: false },
  { name: 'an empty canvas', setUp: () => useStore.setState({ nodes: [] }) },
  { name: 'read-only mode', setUp: () => useStore.setState({ isReadOnly: true }) },
  { name: 'a pending clean-up', pendingCleanUp: true },
];

async function observe(scenario: Scenario, rebuilt: boolean) {
  resetWorkflowStore();
  useStore.setState({ nodes: [{ id: 'a', position: { x: 0, y: 0 }, data: {} }] as never });
  scenario.setUp?.();
  const supplied = handlers();
  if (scenario.pendingCleanUp) supplied.onCleanUp.mockReturnValue(new Promise<void>(() => {}));

  const view = renderHeader({
    supplies: <Supplies {...supplied} isDraft={scenario.isDraft ?? true} />,
    builtInControls: rebuilt ? { cleanUp: false, publish: false } : undefined,
    extra: rebuilt ? <RebuiltControls /> : undefined,
  });
  const cleanUpButton = () => screen.getByRole('button', { name: rebuilt ? 'Tidy' : CLEAN_UP }) as HTMLButtonElement;
  const publishButton = () =>
    screen.getByRole('button', { name: rebuilt ? 'Ship' : 'Publish v7' }) as HTMLButtonElement;

  if (scenario.pendingCleanUp) await act(async () => fireEvent.click(cleanUpButton()));
  const observed = {
    cleanUpDisabled: cleanUpButton().disabled,
    cleanUpBusy: cleanUpButton().getAttribute('aria-busy'),
    publishDisabled: publishButton().disabled,
  };
  await act(async () => {
    fireEvent.click(cleanUpButton());
    fireEvent.click(publishButton());
  });
  const result = {
    ...observed,
    cleanUpCalls: supplied.onCleanUp.mock.calls,
    publishCalls: supplied.onPublish.mock.calls.length,
  };
  view.unmount();
  return result;
}

describe('a host rebuilds Clean up and Publish from actions and state', () => {
  it.each(SCENARIOS)('with $name, the rebuilt controls behave like the built-in ones', async (scenario) => {
    const builtIn = await observe(scenario, false);
    const rebuilt = await observe(scenario, true);

    expect(rebuilt).toEqual(builtIn);
  });
});
