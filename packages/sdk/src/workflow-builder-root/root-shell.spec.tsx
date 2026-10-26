import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../features/i18n/index';
import { AreaTarget } from '../features/ui-extensions/area-target';
import type { BuiltInControls } from '../features/ui-extensions/built-in-controls';
import { useIsBuiltInControlVisible } from '../features/ui-extensions/built-in-controls-context';
import { useUiExtensionRegistry } from '../features/ui-extensions/ui-extension-context';
import type { UiExtensionRegistry } from '../features/ui-extensions/ui-extension-registry';
import { useWorkflowBuilderActions } from '../hooks/use-workflow-builder-actions';
import { WorkflowBuilderRoot } from './workflow-builder-root';

// Loading the diagram is not what these tests are about, and it would open the template selector.
vi.mock('../features/integration/components/runtime-integration-wrapper', () => ({
  RuntimeIntegrationWrapper: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function ControlVisibility() {
  const isDeleteVisible = useIsBuiltInControlVisible('delete');
  const isSaveVisible = useIsBuiltInControlVisible('save');
  return <output>{`delete:${isDeleteVisible} save:${isSaveVisible}`}</output>;
}

function renderRoot(children: ReactNode, builtInControls?: BuiltInControls) {
  const root = (controls?: BuiltInControls) => (
    <StrictMode>
      <WorkflowBuilderRoot builtInControls={controls}>{children}</WorkflowBuilderRoot>
    </StrictMode>
  );
  const view = render(root(builtInControls));
  return { ...view, rerenderRoot: (controls?: BuiltInControls) => view.rerender(root(controls)) };
}

describe('WorkflowBuilderRoot UI extension providers', () => {
  it('builtInControls reaches the built-in controls; a missing key stays visible', () => {
    const { container } = renderRoot(<ControlVisibility />, { delete: false });

    expect(container.querySelector('output')?.textContent).toBe('delete:false save:true');
  });

  it('a new builtInControls value applies on re-render', () => {
    const { container, rerenderRoot } = renderRoot(<ControlVisibility />, { delete: false });

    rerenderRoot({ save: false });

    expect(container.querySelector('output')?.textContent).toBe('delete:true save:false');
  });

  it('a second Root mount starts with an empty registry', () => {
    const renders: { registry: UiExtensionRegistry; element: HTMLElement | null }[] = [];
    function ToolsHost() {
      const registry = useUiExtensionRegistry()!;
      renders.push({ registry, element: registry.getAreaSlot('appBarTools').element });
      return <AreaTarget area="appBarTools" />;
    }
    const first = renderRoot(<ToolsHost />);
    const firstRegistry = renders[0].registry;
    expect(firstRegistry.getAreaSlot('appBarTools').element).not.toBeNull();
    first.unmount();
    renders.length = 0;

    renderRoot(<ToolsHost />);

    expect(renders[0].registry).not.toBe(firstRegistry);
    expect(renders[0].element).toBeNull();
  });

  it('openSettings shows the modal in a Root with only a custom header and no canvas', () => {
    function CustomHeader() {
      const { openSettings } = useWorkflowBuilderActions();
      return <button onClick={openSettings}>Open settings</button>;
    }

    renderRoot(<CustomHeader />);

    fireEvent.click(screen.getByText('Open settings'));

    expect(screen.getByRole('dialog')).not.toBeNull();
  });
});
