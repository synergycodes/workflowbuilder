// Pins the StrictMode + lifecycle contract for `<WorkflowBuilderRoot>`:
// (a) plugin boot runs at most once per fresh first-render of the component
//     (StrictMode double-render with a persisted `useRef` is a no-op);
// (b) the global store is readable imperatively during a descendant's render —
//     the bug the global-store refactor fixed (a per-Root store wasn't yet
//     registered when a child read it during render);
// (c) a true unmount → remount resets the global store to a clean state, so the
//     next workflow starts empty (the documented "sequential workflows"
//     contract); the plugin registry stays intact across cycles (dedup by
//     name / fingerprint at the registry layer, not by Root identity);
// (d) the `useStore` hook subscription stays stable across the StrictMode mount
//     cycle (no runaway re-render loop).
//
// Heavy descendants (`RuntimeIntegrationWrapper`, `RootShell`,
// `ReactFlowProvider`) are stubbed: the contract under test is the Root's own
// lifecycle wiring, not what the children do. Without stubs the test
// transitively pulls `@synergycodes/overflow-ui`'s CSS side-effect import,
// which vitest's node-side transformer can't process.
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../node/node-data';
import { resetWorkflowStore, useStore } from '../store/store';
import { WorkflowBuilderRoot } from './workflow-builder-root';

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('../features/integration/components/runtime-integration-wrapper', () => ({
  RuntimeIntegrationWrapper: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('./root-shell', () => ({
  RootShell: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('../data/palette', () => ({ setCustomPaletteNodes: vi.fn() }));
vi.mock('../data/templates', () => ({ setCustomTemplates: vi.fn() }));
vi.mock('../data/node-templates', () => ({ setCustomNodeTemplates: vi.fn() }));
vi.mock('../features/json-form/extension-registry', () => ({
  registerCustomRenderers: vi.fn(),
  registerCustomCells: vi.fn(),
}));
vi.mock('../features/plugins-core/adapters/adapter-i18n', () => ({
  registerPluginTranslation: vi.fn(),
}));

function makeNode(id: string): WorkflowBuilderNode {
  return {
    id,
    position: { x: 0, y: 0 },
    type: 'action',
    data: { type: 'action', icon: 'Plus', properties: {} },
  };
}

// Reset before each test (not after): at this point the previous test's
// renders are already unmounted, so the reset's store update never reaches a
// still-mounted subscriber outside `act(...)`.
beforeEach(() => {
  resetWorkflowStore();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('WorkflowBuilderRoot — StrictMode lifecycle contract', () => {
  it('boots plugins exactly once per fresh mount (StrictMode double-render is a no-op via useRef)', () => {
    const plugin = vi.fn();
    render(
      <StrictMode>
        <WorkflowBuilderRoot plugins={[plugin]} />
      </StrictMode>,
    );
    expect(plugin).toHaveBeenCalledTimes(1);
  });

  it('exposes the store imperatively during a descendant render (no "before mount" throw)', () => {
    // Regression: a descendant that read the store imperatively during its own
    // render used to crash because the per-Root store had not been registered
    // yet. With a global store, `getState()` always resolves to live state.
    let readError: unknown = null;
    let nodesLengthAtRender = -1;
    function Probe() {
      try {
        nodesLengthAtRender = useStore.getState().nodes.length;
      } catch (error) {
        readError = error;
      }
      return null;
    }
    render(
      <StrictMode>
        <WorkflowBuilderRoot>
          <Probe />
        </WorkflowBuilderRoot>
      </StrictMode>,
    );
    expect(readError).toBeNull();
    expect(nodesLengthAtRender).toBe(0);
  });

  it('resets the global store on a true unmount → remount (sequential workflows)', () => {
    const plugin = vi.fn();

    const first = render(
      <StrictMode>
        <WorkflowBuilderRoot plugins={[plugin]} />
      </StrictMode>,
    );
    // Dirty the store as if the user edited the first workflow.
    act(() => {
      useStore.setState({ nodes: [makeNode('leftover')] });
    });
    expect(useStore.getState().nodes).toHaveLength(1);
    first.unmount();

    const second = render(
      <StrictMode>
        <WorkflowBuilderRoot plugins={[plugin]} />
      </StrictMode>,
    );
    // The remount's reset wiped the leftover diagram — the next workflow is clean.
    expect(useStore.getState().nodes).toEqual([]);
    // Plugin boot runs on every fresh mount (useRef.current resets on remount);
    // the registry-layer dedup is what keeps re-registration cheap.
    expect(plugin).toHaveBeenCalledTimes(2);

    second.unmount();
  });

  it('paints the persisted theme on the DOM at mount, even without an app bar', () => {
    // The theme paint moved off `theme.ts` module level (which crashed SSR
    // imports) into a Root mount effect. A saved non-default theme must still
    // reach `document` on first render, with no app-bar toggle mounted.
    localStorage.setItem('wb-theme', 'dark');

    render(
      <StrictMode>
        <WorkflowBuilderRoot />
      </StrictMode>,
    );

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('useStore hook subscription is stable across the StrictMode mount cycle', () => {
    let renderCount = 0;
    function Probe() {
      const nodes = useStore((s) => s.nodes);
      renderCount += 1;
      return <div data-nodes-len={nodes.length} />;
    }
    const { rerender } = render(
      <StrictMode>
        <WorkflowBuilderRoot>
          <Probe />
        </WorkflowBuilderRoot>
      </StrictMode>,
    );
    const initialRenders = renderCount;
    // Force an unrelated rerender of the host tree; Probe should not escalate
    // beyond an additional StrictMode-double render.
    act(() => {
      rerender(
        <StrictMode>
          <WorkflowBuilderRoot>
            <Probe />
          </WorkflowBuilderRoot>
        </StrictMode>,
      );
    });
    // StrictMode renders each function-component twice in dev: one extra pair
    // for the Probe is the upper bound. Anything beyond that signals a
    // subscription loop.
    expect(renderCount - initialRenders).toBeLessThanOrEqual(2);
  });
});
