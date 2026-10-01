import { type RenderResult, render } from '@testing-library/react';
import { type PropsWithChildren, type ReactNode, StrictMode } from 'react';

import type { BuiltInControls } from './built-in-controls';
import { BuiltInControlsProvider, EMPTY_CONTROLS } from './built-in-controls-context';
import { UiExtensionProvider, useUiExtensionRegistry } from './ui-extension-context';
import type { UiExtensionRegistry } from './ui-extension-registry';

type RenderInRootOptions = {
  builtInControls?: BuiltInControls;
};

/**
 * Renders `ui` under `StrictMode` inside the providers `RootShell` sets up, and returns the Testing
 * Library result plus the Root's registry. `rerender` keeps the providers, so the registry survives.
 */
export function renderInRoot(
  ui: ReactNode,
  { builtInControls }: RenderInRootOptions = {},
): RenderResult & { registry: UiExtensionRegistry } {
  const captured: { registry: UiExtensionRegistry | null } = { registry: null };

  function RegistryProbe() {
    captured.registry = useUiExtensionRegistry();
    return null;
  }

  function Root({ children }: PropsWithChildren) {
    return (
      <StrictMode>
        <BuiltInControlsProvider value={builtInControls ?? EMPTY_CONTROLS}>
          <UiExtensionProvider>
            <RegistryProbe />
            {children}
          </UiExtensionProvider>
        </BuiltInControlsProvider>
      </StrictMode>
    );
  }

  const result = render(ui, { wrapper: Root });
  if (!captured.registry) throw new Error('renderInRoot: the registry provider did not render');

  return { ...result, registry: captured.registry };
}
