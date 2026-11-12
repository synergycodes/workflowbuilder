import { type ReactNode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TemplatePicker } from './template-picker';
import { hasSeenWelcome, openTemplatePicker, useTemplatePickerStore } from './template-picker-store';
import { welcomeTemplates } from './welcome-templates';

const sdk = vi.hoisted(() => {
  const state = { setDiagramModel: vi.fn(), isReadOnly: false, nodes: ['a node'] };
  const useStore = (selector: (current: typeof state) => unknown) => selector(state);
  return { state, useStore, fitView: vi.fn() };
});

vi.mock('@workflowbuilder/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@workflowbuilder/sdk')>()),
  useStore: sdk.useStore,
  useFitView: () => sdk.fitView,
  PaletteFooterContent: ({ children }: { children: ReactNode }) => <div data-area="palette-footer">{children}</div>,
}));

// The modal renders in a portal on the page, outside the container.
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const tiles = () => [...dialog()!.querySelectorAll<HTMLButtonElement>('[role="group"] button')];
const templatesButton = () => document.querySelector<HTMLButtonElement>('[data-area="palette-footer"] button')!;

function textOf(ids: string | null) {
  return (ids ?? '')
    .split(' ')
    .map((id) => document.querySelector(`[id="${id}"]`)?.textContent)
    .join(' ');
}

const nameOf = (element: Element) => textOf(element.getAttribute('aria-labelledby'));
const descriptionOf = (element: Element) => textOf(element.getAttribute('aria-describedby'));

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function pressEscape() {
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
}

describe('TemplatePicker', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    useTemplatePickerStore.setState({ open: false, variant: 'welcome' });
    sdk.state.setDiagramModel.mockClear();
    sdk.state.isReadOnly = false;
    sdk.state.nodes = ['a node'];
    sdk.fitView.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<TemplatePicker />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens Welcome described by the lead, with Refund Review first and recommended', () => {
    act(() => openTemplatePicker('welcome'));

    expect(nameOf(dialog()!)).toBe('Welcome to AI Studio');
    expect(descriptionOf(dialog()!)).toBe(
      'A live demo of Workflow Builder – a toolkit for building visual workflow editors with AI.',
    );
    expect(tiles().map((tile) => nameOf(tile))).toEqual([
      'Refund Review Recommended',
      'Customer Support Triage',
      'AI Debate',
      'Content Repurposer',
      'Meeting Notes to Action Items',
      'Market Research Brief',
      'Empty canvas',
    ]);
  });

  it('opens Select a template from the palette, described by the warning and with no recommended tile', async () => {
    await click(templatesButton());

    expect(nameOf(dialog()!)).toBe('Select a template');
    expect(descriptionOf(dialog()!)).toMatch(/^Starting a new template replaces your current workflow\./);
    expect(nameOf(dialog()!.querySelector('[role="group"]')!)).toBe('Available templates');
    expect(tiles()[0]!.getAttribute('aria-labelledby')).not.toContain(' ');
  });

  it('leaves the warning out of Select a template over an empty canvas', async () => {
    sdk.state.nodes = [];

    await click(templatesButton());

    expect(nameOf(dialog()!)).toBe('Select a template');
    expect(dialog()!.hasAttribute('aria-describedby')).toBe(false);
    expect(dialog()!.textContent).not.toContain('replaces your current workflow');
  });

  it('loads the clicked template, fits it to the view and closes', async () => {
    act(() => openTemplatePicker('welcome'));

    await click(tiles()[1]!);

    expect(sdk.state.setDiagramModel).toHaveBeenCalledExactlyOnceWith(welcomeTemplates[1]!.template.value);
    expect(sdk.fitView).toHaveBeenCalledOnce();
    expect(dialog()).toBeNull();
  });

  it('remembers that Welcome was seen, but not Select a template', async () => {
    await click(templatesButton());
    await pressEscape();
    expect(hasSeenWelcome()).toBe(false);

    act(() => openTemplatePicker('welcome'));
    await pressEscape();
    expect(hasSeenWelcome()).toBe(true);
    expect(sdk.state.setDiagramModel).not.toHaveBeenCalled();
  });

  it('has no way back to the templates other than the palette button', () => {
    expect(document.querySelectorAll('button')).toHaveLength(1);
    expect(templatesButton()).toBeDefined();
  });

  it('disables the Templates button in a read-only view', () => {
    sdk.state.isReadOnly = true;
    act(() => root.render(<TemplatePicker />));

    expect(templatesButton().disabled).toBe(true);
  });
});
