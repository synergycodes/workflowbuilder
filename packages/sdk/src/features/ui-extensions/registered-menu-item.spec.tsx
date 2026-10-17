import { render } from '@testing-library/react';
import { type Node, ReactFlow } from '@xyflow/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RegisteredMenuItem } from './registered-menu-item';
import { renderInRoot } from './test-utils';

function NodeWithMenuItem() {
  return <RegisteredMenuItem menu="appBar" componentName="AppBarMenuItem" label="Per node" />;
}

const nodeTypes = { withMenuItem: NodeWithMenuItem };
const nodes: Node[] = [{ id: 'n1', type: 'withMenuItem', position: { x: 0, y: 0 }, data: {} }];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('RegisteredMenuItem', () => {
  it('registers on mount and removes on unmount', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onClick = vi.fn();
    function Menu({ withItem }: { withItem: boolean }) {
      return withItem ? (
        <RegisteredMenuItem menu="appBar" componentName="AppBarMenuItem" label="Duplicate" onClick={onClick} />
      ) : null;
    }
    const { registry, rerender } = renderInRoot(<Menu withItem />);

    expect(registry.getMenuItems('appBar')).toEqual([expect.objectContaining({ label: 'Duplicate' })]);
    expect(registry.getMenuItems('project')).toEqual([]);
    registry.getMenuItems('appBar')[0].onClick?.();
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<Menu withItem={false} />);

    expect(registry.getMenuItems('appBar')).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('prop change updates the item in place (same index)', () => {
    function Menu({ firstLabel, isFirstDisabled }: { firstLabel: string; isFirstDisabled: boolean }) {
      return (
        <>
          <RegisteredMenuItem
            menu="project"
            componentName="ProjectMenuItem"
            label={firstLabel}
            disabled={isFirstDisabled}
          />
          <RegisteredMenuItem menu="project" componentName="ProjectMenuItem" label="Second" />
        </>
      );
    }
    const { registry, rerender } = renderInRoot(<Menu firstLabel="First" isFirstDisabled={false} />);
    const [first] = registry.getMenuItems('project');

    rerender(<Menu firstLabel="Renamed" isFirstDisabled />);

    const items = registry.getMenuItems('project');
    expect(items.map(({ label }) => label)).toEqual(['Renamed', 'Second']);
    expect(items[0]).toEqual(expect.objectContaining({ id: first.id, disabled: true }));
  });

  it('a new inline onClick neither notifies the registry nor replaces the item, and a click runs the latest one', () => {
    const clicks: number[] = [];
    function Producer({ round }: { round: number }) {
      return (
        <RegisteredMenuItem
          menu="appBar"
          componentName="AppBarMenuItem"
          label="Item"
          onClick={() => clicks.push(round)}
        />
      );
    }
    const { registry, rerender } = renderInRoot(<Producer round={1} />);
    const [registered] = registry.getMenuItems('appBar');
    const listener = vi.fn();
    registry.subscribe(listener);

    rerender(<Producer round={2} />);

    expect(listener).not.toHaveBeenCalled();
    expect(registry.getMenuItems('appBar')[0]).toBe(registered);
    registered.onClick?.();
    expect(clicks).toEqual([2]);
  });

  it('an item without onClick registers none, and gains one when the prop appears', () => {
    const onClick = vi.fn();
    function Producer({ withHandler }: { withHandler: boolean }) {
      return (
        <RegisteredMenuItem
          menu="appBar"
          componentName="AppBarMenuItem"
          label="Item"
          onClick={withHandler ? onClick : undefined}
        />
      );
    }
    const { registry, rerender } = renderInRoot(<Producer withHandler={false} />);

    expect(registry.getMenuItems('appBar')[0].onClick).toBeUndefined();

    rerender(<Producer withHandler />);

    registry.getMenuItems('appBar')[0].onClick?.();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('two instances keep mount order', () => {
    function Menu({ withLater }: { withLater: boolean }) {
      return (
        <>
          {withLater && (
            <RegisteredMenuItem menu="propertiesPanel" componentName="PropertiesPanelMenuItem" label="Later" />
          )}
          <RegisteredMenuItem menu="propertiesPanel" componentName="PropertiesPanelMenuItem" label="Earlier" />
        </>
      );
    }
    const { registry, rerender } = renderInRoot(<Menu withLater={false} />);

    rerender(<Menu withLater />);

    expect(registry.getMenuItems('propertiesPanel').map(({ label }) => label)).toEqual(['Earlier', 'Later']);
  });

  it('warns once outside Root', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <StrictMode>
        <RegisteredMenuItem menu="appBar" componentName="AppBarMenuItem" label="Duplicate" />
      </StrictMode>,
    );

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<AppBarMenuItem>'));
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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { registry } = renderInRoot(<ReactFlow nodes={nodes} nodeTypes={nodeTypes} />);

    expect(registry.getMenuItems('appBar').map(({ label }) => label)).toEqual(['Per node']);
    const itemWarnings = warn.mock.calls.filter(([message]) => String(message).includes('<AppBarMenuItem>'));
    expect(itemWarnings).toHaveLength(1);
    expect(String(itemWarnings[0][0])).toContain('canvas node');
  });
});
