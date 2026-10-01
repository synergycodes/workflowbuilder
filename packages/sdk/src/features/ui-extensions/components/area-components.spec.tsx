import { fireEvent, screen, within } from '@testing-library/react';
import type { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../store/store';
import { Controls } from '../../app-bar/components/controls/controls';
import { Toolbar } from '../../app-bar/components/toolbar/toolbar';
import '../../i18n/index';
import { PaletteContainer } from '../../palette/palette-container';
import { registerComponentDecorator } from '../../plugins-core/adapters/adapter-components';
import { OptionalAppChildren } from '../../plugins-core/components/app/optional-app-children';
import { PropertiesBar } from '../../properties-bar/components/properties-bar/properties-bar';
import { renderInRoot } from '../test-utils';
import type { AreaId, AreaPlace, UiExtensionRegistry } from '../ui-extension-registry';
import { AppBarControlsContent } from './app-bar-controls-content';
import { AppBarToolsContent } from './app-bar-tools-content';
import { PaletteFooterContent } from './palette-footer-content';
import { PaletteHeaderContent } from './palette-header-content';
import { PropertiesPanelFooterContent } from './properties-panel-footer-content';
import { PropertiesPanelHeaderContent } from './properties-panel-header-content';

const node = {
  id: 'node-1',
  type: 'node',
  position: { x: 0, y: 0 },
  data: { type: 'action', icon: 'Play', properties: { label: 'Review' } },
} as unknown as WorkflowBuilderNode;

// Host containers an area's target sits in directly: an app bar group, a sidebar header or footer.
const APP_BAR_TOOLS = '[class*="nav-segment"]';
const APP_BAR_CONTROLS = '[class*="controls"]';
const SIDEBAR_HEADER = '[class*="sidebar"] > [class*="header"]';
const SIDEBAR_FOOTER = '[class*="footer-area"] > [class*="footer"]';

// A custom tab keeps the node's own properties form, and its store, out of the test.
function Hosts() {
  return (
    <>
      <Toolbar />
      <Controls />
      <PaletteContainer />
      <PropertiesBar
        selection={{ node, edge: null }}
        selectedTab="custom"
        onTabChange={vi.fn()}
        onDeleteClick={vi.fn()}
        headerLabel="Properties"
        deleteNodeLabel="Delete node"
        deleteEdgeLabel="Delete edge"
        tabs={[{ label: 'Custom', value: 'custom', components: [] }]}
      />
    </>
  );
}

function renderHosts(ui?: ReactNode) {
  return renderInRoot(
    <>
      <Hosts />
      {ui}
    </>,
  );
}

function targetOf(registry: UiExtensionRegistry, area: AreaId, place: AreaPlace = 'before'): HTMLElement {
  const { element } = registry.getAreaSlot(area, place);
  if (!element) throw new Error(`No ${place} target is mounted for ${area}`);
  return element;
}

function isBefore(first: Element, second: Element) {
  return first.compareDocumentPosition(second) === Node.DOCUMENT_POSITION_FOLLOWING;
}

const PLUGIN = 'area-components-spec-plugin';
const BEFORE = 'area-components-spec-before';
const AFTER = 'area-components-spec-after';

function Before() {
  return <button type="button">Before</button>;
}

function After() {
  return <button type="button">After</button>;
}

beforeEach(() => {
  resetWorkflowStore();
  useStore.setState({ isPaletteOpen: true, isPropertiesPanelOpen: true });
});

afterEach(() => {
  // Registering a name again replaces the entry, and an entry without content renders nothing.
  for (const slot of [
    'OptionalAppChildren',
    'OptionalAppBarTools',
    'OptionalAppBarControls',
    'OptionalFooterContent',
  ]) {
    for (const name of [PLUGIN, BEFORE, AFTER]) registerComponentDecorator(slot, { name });
  }
  vi.restoreAllMocks();
});

type AreaCase = {
  name: string;
  Content: (props: PropsWithChildren<{ place?: AreaPlace }>) => ReactNode;
  area: AreaId;
  container: string;
  /** A built-in element of the same host container. */
  builtIn: () => HTMLElement;
  /** Where the content stands relative to `builtIn`. */
  position: 'before' | 'after';
  /** The last built-in element of the host container that `place="after"` content follows. */
  lastBuiltIn: () => HTMLElement;
};

const AREA_CASES: AreaCase[] = [
  {
    name: 'AppBarToolsContent',
    Content: AppBarToolsContent,
    area: 'appBarTools',
    container: APP_BAR_TOOLS,
    builtIn: () => screen.getByRole('button', { name: 'Save' }),
    position: 'before',
    lastBuiltIn: () => screen.getByRole('button', { name: 'Save' }),
  },
  {
    name: 'AppBarControlsContent',
    Content: AppBarControlsContent,
    area: 'appBarControls',
    container: APP_BAR_CONTROLS,
    builtIn: () => screen.getByRole('button', { name: /Change Language/i }),
    position: 'before',
    lastBuiltIn: () => screen.getAllByRole('switch').at(-1)!,
  },
  {
    name: 'PaletteHeaderContent',
    Content: PaletteHeaderContent,
    area: 'paletteHeader',
    container: SIDEBAR_HEADER,
    builtIn: () => screen.getByText('Nodes Library'),
    position: 'after',
    lastBuiltIn: () => screen.getByRole('button', { name: 'Close palette' }),
  },
  {
    name: 'PaletteFooterContent',
    Content: PaletteFooterContent,
    area: 'paletteFooter',
    container: SIDEBAR_FOOTER,
    builtIn: () => screen.getByRole('button', { name: 'Templates' }),
    position: 'before',
    lastBuiltIn: () => screen.getByRole('button', { name: 'Templates' }),
  },
  {
    name: 'PropertiesPanelHeaderContent',
    Content: PropertiesPanelHeaderContent,
    area: 'propertiesPanelHeader',
    container: SIDEBAR_HEADER,
    builtIn: () => screen.getByText('Review'),
    position: 'after',
    lastBuiltIn: () => screen.getByRole('button', { name: 'Custom' }),
  },
  {
    name: 'PropertiesPanelFooterContent',
    Content: PropertiesPanelFooterContent,
    area: 'propertiesPanelFooter',
    container: SIDEBAR_FOOTER,
    builtIn: () => screen.getByRole('button', { name: 'Delete node' }),
    position: 'before',
    lastBuiltIn: () => screen.getByRole('button', { name: 'Delete node' }),
  },
];

const DEPRECATED_SLOT_CASES = [
  { slot: 'OptionalAppBarTools', area: 'appBarTools' },
  { slot: 'OptionalAppBarControls', area: 'appBarControls' },
  { slot: 'OptionalFooterContent', area: 'paletteFooter' },
].map(({ slot, area }) => ({ slot, ...AREA_CASES.find((areaCase) => areaCase.area === area)! }));

describe('area content components', () => {
  it.each(AREA_CASES)(
    '$name renders in its area from the app tree',
    ({ Content, area, container, builtIn, position }) => {
      const { registry } = renderHosts(
        <Content>
          <button type="button">Mine</button>
        </Content>,
      );

      const content = screen.getByRole('button', { name: 'Mine' });
      const target = targetOf(registry, area);
      expect(content.parentElement).toBe(target);
      expect(target.parentElement).toBe(builtIn().closest(container));
      expect(position === 'before' ? isBefore(content, builtIn()) : isBefore(builtIn(), content)).toBe(true);
    },
  );

  it.each(AREA_CASES)(
    '$name with place="after" renders after the built-in controls and after the content placed before',
    ({ Content, area, container, lastBuiltIn }) => {
      const { registry } = renderHosts(
        <>
          <Content place="after">
            <button type="button">Last</button>
          </Content>
          <Content>
            <button type="button">First</button>
          </Content>
        </>,
      );

      const last = screen.getByRole('button', { name: 'Last' });
      const target = targetOf(registry, area, 'after');
      expect(last.parentElement).toBe(target);
      expect(target.parentElement).toBe(lastBuiltIn().closest(container));
      expect(isBefore(lastBuiltIn(), last)).toBe(true);
      expect(isBefore(screen.getByRole('button', { name: 'First' }), last)).toBe(true);
    },
  );

  it('AppBarControlsContent with place="after" stays before the menu button', () => {
    renderHosts(
      <AppBarControlsContent place="after">
        <button type="button">Last</button>
      </AppBarControlsContent>,
    );

    expect(isBefore(screen.getByRole('button', { name: 'Last' }), screen.getByRole('button', { name: 'Menu' }))).toBe(
      true,
    );
  });

  it.each(DEPRECATED_SLOT_CASES)(
    '$name with place="after" renders after the after-content of a deprecated $slot decorator',
    ({ slot, Content, area, lastBuiltIn }) => {
      registerComponentDecorator(slot, { name: AFTER, place: 'after', content: After });

      const { registry } = renderHosts(
        <Content place="after">
          <button type="button">Mine</button>
        </Content>,
      );

      const mine = screen.getByRole('button', { name: 'Mine' });
      const after = screen.getByRole('button', { name: 'After' });
      expect(mine.parentElement).toBe(targetOf(registry, area, 'after'));
      expect(isBefore(lastBuiltIn(), after)).toBe(true);
      expect(isBefore(after, mine)).toBe(true);
    },
  );

  it('content from a plugin mounted through OptionalAppChildren renders', () => {
    function PluginControls() {
      return (
        <PaletteHeaderContent>
          <button type="button">Import nodes</button>
        </PaletteHeaderContent>
      );
    }
    registerComponentDecorator('OptionalAppChildren', { name: PLUGIN, content: PluginControls });

    const { registry } = renderHosts(<OptionalAppChildren />);

    expect(within(targetOf(registry, 'paletteHeader')).getByRole('button', { name: 'Import nodes' })).toBeTruthy();
  });

  it.each(DEPRECATED_SLOT_CASES)(
    'a deprecated $slot decorator and $name render together in the documented order with no extra wrapper',
    ({ slot, Content, area, builtIn }) => {
      registerComponentDecorator(slot, { name: BEFORE, place: 'before', content: Before });
      registerComponentDecorator(slot, { name: AFTER, place: 'after', content: After });

      const { registry } = renderHosts(
        <Content>
          <button type="button">Mine</button>
        </Content>,
      );

      const target = targetOf(registry, area);
      const container = target.parentElement!;
      const before = screen.getByRole('button', { name: 'Before' });
      const after = screen.getByRole('button', { name: 'After' });
      expect(target.children).toHaveLength(1);
      expect(target.firstElementChild).toBe(screen.getByRole('button', { name: 'Mine' }));
      expect(container.children[0]).toBe(target);
      expect(container.children[1]).toBe(before);
      expect(after.parentElement).toBe(container);
      expect(container.contains(builtIn())).toBe(true);
      expect(isBefore(before, builtIn())).toBe(true);
      expect(isBefore(builtIn(), after)).toBe(true);
    },
  );

  it('an empty area adds no visible element', () => {
    const { registry } = renderHosts();

    for (const { area, container, builtIn } of AREA_CASES) {
      const target = targetOf(registry, area);
      expect(target.parentElement, area).toBe(builtIn().closest(container));
      expect(target.className, area).toContain('target');
      expect(target.matches(':empty'), area).toBe(true);
    }
  });

  it('an empty after-target adds no visible element', () => {
    const { registry } = renderHosts();

    for (const { area, container, lastBuiltIn } of AREA_CASES) {
      const target = targetOf(registry, area, 'after');
      expect(target.parentElement, area).toBe(lastBuiltIn().closest(container));
      expect(isBefore(lastBuiltIn(), target), area).toBe(true);
      expect(target.className, area).toContain('target');
      expect(target.matches(':empty'), area).toBe(true);
    }
  });

  it('renders nothing, and does not warn, when its area is absent from a custom layout', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderInRoot(
      <>
        <Toolbar />
        <PaletteFooterContent>
          <button type="button">Mine</button>
        </PaletteFooterContent>
      </>,
    );

    expect(screen.queryByRole('button', { name: 'Mine' })).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('the palette header row disappears when the palette collapses', () => {
    const { registry } = renderHosts(
      <PaletteHeaderContent>
        <input aria-label="Search nodes" />
      </PaletteHeaderContent>,
    );
    expect(screen.getByRole('textbox', { name: 'Search nodes' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close palette' }));

    expect(screen.queryByRole('textbox', { name: 'Search nodes' })).toBeNull();
    expect(registry.getAreaSlot('paletteHeader').element).toBeNull();
    expect(registry.getAreaSlot('paletteHeader', 'after').element).toBeNull();
    expect(screen.getByText('Nodes Library')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open palette' }));

    expect(screen.getByRole('textbox', { name: 'Search nodes' })).toBeTruthy();
  });

  it('the properties panel header row disappears when the panel collapses', () => {
    const { registry } = renderHosts(
      <PropertiesPanelHeaderContent>
        <button type="button">Docs</button>
      </PropertiesPanelHeaderContent>,
    );
    expect(screen.getByRole('button', { name: 'Docs' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close properties bar' }));

    expect(screen.queryByRole('button', { name: 'Docs' })).toBeNull();
    expect(registry.getAreaSlot('propertiesPanelHeader').element).toBeNull();
    expect(registry.getAreaSlot('propertiesPanelHeader', 'after').element).toBeNull();
    expect(screen.getByText('Properties')).toBeTruthy();
  });
});
