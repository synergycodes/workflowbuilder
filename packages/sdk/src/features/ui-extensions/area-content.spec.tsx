import { fireEvent, render, screen, within } from '@testing-library/react';
import { type Node, ReactFlow } from '@xyflow/react';
import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AreaContent } from './area-content';
import { AreaTarget } from './area-target';
import { renderInRoot } from './test-utils';
import type { AreaId, UiExtensionRegistry } from './ui-extension-registry';

function targetOf(registry: UiExtensionRegistry, area: AreaId): HTMLElement {
  const { element } = registry.getAreaSlot(area);
  if (!element) throw new Error(`No target is mounted for ${area}`);
  return element;
}

function silenceWarnings() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {});
}

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((current) => current + 1)}>
      Count {count}
    </button>
  );
}

function NodeWithContent() {
  return (
    <AreaContent area="paletteFooter" componentName="PaletteFooterContent">
      From a node
    </AreaContent>
  );
}

const nodeTypes = { withContent: NodeWithContent };
const nodes: Node[] = [{ id: 'n1', type: 'withContent', position: { x: 0, y: 0 }, data: {} }];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('AreaContent', () => {
  it('portals its children into the matching AreaTarget', () => {
    const warn = silenceWarnings();
    const { registry } = renderInRoot(
      <>
        <AreaTarget area="appBarTools" />
        <AreaTarget area="paletteFooter" />
        <section aria-label="Producer">
          <AreaContent area="appBarTools" componentName="AppBarToolsContent">
            <button type="button">Mine</button>
          </AreaContent>
        </section>
      </>,
    );

    expect(within(targetOf(registry, 'appBarTools')).getByRole('button', { name: 'Mine' })).toBeTruthy();
    expect(targetOf(registry, 'paletteFooter').childNodes).toHaveLength(0);
    expect(within(screen.getByRole('region', { name: 'Producer' })).queryByRole('button')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('renders nothing and warns once outside Root', () => {
    const warn = silenceWarnings();

    render(
      <StrictMode>
        <AreaContent area="appBarTools" componentName="AppBarToolsContent">
          <button type="button">Mine</button>
        </AreaContent>
      </StrictMode>,
    );

    expect(screen.queryByRole('button', { name: 'Mine' })).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<AppBarToolsContent>'));
  });

  it('warns outside Root in a production build too', () => {
    vi.stubEnv('DEV', false);
    const warn = silenceWarnings();

    render(
      <AreaContent area="appBarTools" componentName="AppBarToolsContent">
        <button type="button">Mine</button>
      </AreaContent>,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<AppBarToolsContent>'));
  });

  it('warns when rendered inside a canvas node', () => {
    // React Flow observes the size of its pane as it mounts; jsdom has no ResizeObserver.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const warn = silenceWarnings();

    const { registry } = renderInRoot(
      <>
        <AreaTarget area="paletteFooter" />
        <ReactFlow nodes={nodes} nodeTypes={nodeTypes} />
      </>,
    );

    expect(within(targetOf(registry, 'paletteFooter')).getByText('From a node')).toBeTruthy();
    const contentWarnings = warn.mock.calls.filter(([message]) => String(message).includes('<PaletteFooterContent>'));
    expect(contentWarnings).toHaveLength(1);
    expect(String(contentWarnings[0][0])).toContain('canvas node');
  });

  it('appears when the target mounts after the content', () => {
    function Layout({ withTarget }: { withTarget: boolean }) {
      return (
        <>
          {withTarget && <AreaTarget area="propertiesPanelFooter" />}
          <AreaContent area="propertiesPanelFooter" componentName="PropertiesPanelFooterContent">
            <button type="button">Approve</button>
          </AreaContent>
        </>
      );
    }
    const { registry, rerender } = renderInRoot(<Layout withTarget={false} />);
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();

    rerender(<Layout withTarget />);

    expect(within(targetOf(registry, 'propertiesPanelFooter')).getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  it('false children leave the target empty so CSS hides it', () => {
    const { registry } = renderInRoot(
      <>
        <AreaTarget area="appBarControls" />
        <AreaContent area="appBarControls" componentName="AppBarControlsContent">
          {false}
        </AreaContent>
      </>,
    );

    expect(targetOf(registry, 'appBarControls').matches(':empty')).toBe(true);
  });

  it('StrictMode double mount leaves one portal', () => {
    const { registry } = renderInRoot(
      <>
        <AreaTarget area="appBarTools" />
        <AreaContent area="appBarTools" componentName="AppBarToolsContent">
          <button type="button">Mine</button>
        </AreaContent>
      </>,
    );

    expect(screen.getAllByRole('button', { name: 'Mine' })).toHaveLength(1);
    expect(targetOf(registry, 'appBarTools').childNodes).toHaveLength(1);
  });

  it('events from the portal bubble through the React tree', () => {
    const onClick = vi.fn();
    renderInRoot(
      <>
        <AreaTarget area="appBarTools" />
        <div onClick={onClick}>
          <AreaContent area="appBarTools" componentName="AppBarToolsContent">
            <button type="button">Mine</button>
          </AreaContent>
        </div>
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mine' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('portal children keep their state when a sibling content unmounts', () => {
    function Layout({ withSibling }: { withSibling: boolean }) {
      return (
        <>
          <AreaTarget area="paletteFooter" />
          <AreaContent area="paletteFooter" componentName="PaletteFooterContent">
            <Counter />
          </AreaContent>
          {withSibling && (
            <AreaContent area="paletteFooter" componentName="PaletteFooterContent">
              <span>Sibling</span>
            </AreaContent>
          )}
        </>
      );
    }
    const { rerender } = renderInRoot(<Layout withSibling={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Count 0' }));

    rerender(<Layout withSibling />);
    expect(screen.getByText('Sibling')).toBeTruthy();
    rerender(<Layout withSibling={false} />);

    expect(screen.queryByText('Sibling')).toBeNull();
    expect(screen.getByRole('button', { name: 'Count 1' })).toBeTruthy();
  });
});
