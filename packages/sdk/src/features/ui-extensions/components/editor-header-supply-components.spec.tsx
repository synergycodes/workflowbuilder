import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type WorkflowBuilderActions, useWorkflowBuilderActions } from '../../../hooks/use-workflow-builder-actions';
import { type WorkflowBuilderState, useWorkflowBuilderState } from '../../../hooks/use-workflow-builder-state';
import { resetWorkflowStore, useStore } from '../../../store/store';
import { IntegrationContextWrapper } from '../../integration/components/integration-variants/context/integration-context-wrapper';
import { registerComponentDecorator } from '../../plugins-core/adapters/adapter-components';
import { OptionalAppChildren } from '../../plugins-core/components/app/optional-app-children';
import { renderInRoot } from '../test-utils';
import { EditorHeaderCleanUp } from './editor-header-clean-up';
import { EditorHeaderPublish } from './editor-header-publish';
import { EditorHeaderSaveAsPdf } from './editor-header-save-as-pdf';
import { EditorHeaderVersion } from './editor-header-version';

vi.mock('@/features/changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

const PLUGIN = 'editor-header-supply-components-spec-plugin';

type Via = 'app tree' | 'plugin';
const VIAS: Via[] = ['app tree', 'plugin'];

function renderWithSupplies(supplies: ReactNode, via: Via) {
  const seen: { state: WorkflowBuilderState | null; actions: WorkflowBuilderActions | null } = {
    state: null,
    actions: null,
  };

  function Probe() {
    seen.state = useWorkflowBuilderState();
    seen.actions = useWorkflowBuilderActions();
    return null;
  }

  if (via === 'plugin') {
    registerComponentDecorator('OptionalAppChildren', { name: PLUGIN, content: () => supplies });
  }

  const view = renderInRoot(
    <IntegrationContextWrapper onSave={vi.fn()} autoSave={false}>
      <Probe />
      {via === 'app tree' ? supplies : <OptionalAppChildren />}
    </IntegrationContextWrapper>,
  );

  return { ...view, state: () => seen.state!, actions: () => seen.actions! };
}

beforeEach(() => {
  resetWorkflowStore();
  useStore.setState({ nodes: [{ id: 'a' }] as never });
});

afterEach(() => {
  // Registering a name again replaces the entry, and an entry without content renders nothing.
  registerComponentDecorator('OptionalAppChildren', { name: PLUGIN });
  vi.restoreAllMocks();
});

describe.each(VIAS)('editor header supplies from the %s', (via) => {
  it('nothing is available before anything is supplied', () => {
    const view = renderWithSupplies(null, via);

    expect(view.state().availableActions).toEqual({ cleanUp: false, saveAsPdf: false, publish: false });
    expect(view.state().version).toBeNull();
  });

  it('EditorHeaderCleanUp makes cleanUp available and runs onCleanUp', async () => {
    const onCleanUp = vi.fn();
    const view = renderWithSupplies(<EditorHeaderCleanUp onCleanUp={onCleanUp} />, via);

    expect(view.state().availableActions.cleanUp).toBe(true);
    await act(() => view.actions().cleanUp());

    expect(onCleanUp).toHaveBeenCalledWith('RIGHT');
  });

  it('EditorHeaderSaveAsPdf makes saveAsPdf available and runs onSaveAsPdf', () => {
    const onSaveAsPdf = vi.fn();
    const view = renderWithSupplies(<EditorHeaderSaveAsPdf onSaveAsPdf={onSaveAsPdf} />, via);

    expect(view.state().availableActions.saveAsPdf).toBe(true);
    view.actions().saveAsPdf();

    expect(onSaveAsPdf).toHaveBeenCalledTimes(1);
  });

  it('EditorHeaderVersion and EditorHeaderPublish make the version readable and publish available', () => {
    const onPublish = vi.fn();
    const view = renderWithSupplies(
      <>
        <EditorHeaderVersion number={7} isDraft />
        <EditorHeaderPublish onPublish={onPublish} />
      </>,
      via,
    );

    expect(view.state().version).toEqual({ number: 7, isDraft: true });
    expect(view.state().availableActions.publish).toBe(true);
    view.actions().publish();

    expect(onPublish).toHaveBeenCalledTimes(1);
  });
});

describe('editor header supply components', () => {
  it('stop supplying once unmounted', () => {
    const supplies = (
      <>
        <EditorHeaderCleanUp onCleanUp={vi.fn()} />
        <EditorHeaderSaveAsPdf onSaveAsPdf={vi.fn()} />
        <EditorHeaderVersion number={1} isDraft />
        <EditorHeaderPublish onPublish={vi.fn()} />
      </>
    );
    const view = renderWithSupplies(supplies, 'app tree');

    view.rerender(
      <IntegrationContextWrapper onSave={vi.fn()} autoSave={false}>
        {null}
      </IntegrationContextWrapper>,
    );

    expect(view.registry.getHeaderSupply('cleanUp')).toBeUndefined();
    expect(view.registry.getHeaderSupply('saveAsPdf')).toBeUndefined();
    expect(view.registry.getHeaderSupply('version')).toBeUndefined();
    expect(view.registry.getHeaderSupply('publish')).toBeUndefined();
  });

  it('a new inline handler runs without notifying the header', () => {
    const first = vi.fn();
    const second = vi.fn();
    const view = renderInRoot(<EditorHeaderSaveAsPdf onSaveAsPdf={first} />);
    const listener = vi.fn();
    view.registry.subscribe(listener);

    view.rerender(<EditorHeaderSaveAsPdf onSaveAsPdf={second} />);
    view.registry.getHeaderSupply('saveAsPdf')!();

    expect(listener).not.toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('the one mounted last is used, with a warning, and the earlier one returns when it unmounts', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fromPlugin = vi.fn();
    const fromApp = vi.fn();
    const view = renderInRoot(<EditorHeaderSaveAsPdf onSaveAsPdf={fromPlugin} />);

    view.rerender(
      <>
        <EditorHeaderSaveAsPdf onSaveAsPdf={fromPlugin} />
        <EditorHeaderSaveAsPdf onSaveAsPdf={fromApp} />
      </>,
    );
    view.registry.getHeaderSupply('saveAsPdf')!();

    expect(fromApp).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('<EditorHeaderSaveAsPdf> is mounted more than once');

    view.rerender(<EditorHeaderSaveAsPdf onSaveAsPdf={fromPlugin} />);
    view.registry.getHeaderSupply('saveAsPdf')!();

    expect(fromPlugin).toHaveBeenCalledTimes(1);
  });

  it('a changed version replaces the supplied one', () => {
    const view = renderInRoot(<EditorHeaderVersion number={1} isDraft />);

    view.rerender(<EditorHeaderVersion number={2} isDraft={false} />);

    expect(view.registry.getHeaderSupply('version')).toEqual({ number: 2, isDraft: false });
  });

  it('warns outside <WorkflowBuilder.Root>', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<EditorHeaderPublish onPublish={vi.fn()} />);

    expect(warn).toHaveBeenCalledWith(
      '[@workflowbuilder/sdk] <EditorHeaderPublish> supplies nothing outside <WorkflowBuilder.Root>.',
    );
  });
});
