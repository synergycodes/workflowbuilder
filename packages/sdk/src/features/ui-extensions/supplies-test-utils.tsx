import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { IntegrationContextWrapper } from '../integration/components/integration-variants/context/integration-context-wrapper';
import { registerComponentDecorator } from '../plugins-core/adapters/adapter-components';
import { OptionalAppChildren } from '../plugins-core/components/app/optional-app-children';
import type { BuiltInControls } from './built-in-controls';
import { renderInRoot } from './test-utils';
import { PluginSupplySource } from './ui-extension-context';

/** Where the supplies mount: in the app's own tree, or through a plugin's `OptionalAppChildren`. */
export type SupplyRoute = 'app tree' | 'plugin';

export const SUPPLY_ROUTES: SupplyRoute[] = ['app tree', 'plugin'];

const PLUGIN = 'supplies-test-plugin';

type Options = { via?: SupplyRoute; builtInControls?: BuiltInControls; after?: ReactNode };

/** Renders `ui`, then `supplies`, then `after`, in a Root with actions. Call {@link removeSuppliesPlugin} after each test. */
export function renderWithSupplies(
  ui: ReactNode,
  supplies: ReactNode,
  { via = 'app tree', builtInControls, after }: Options = {},
) {
  if (via === 'plugin') {
    registerComponentDecorator('OptionalAppChildren', { name: PLUGIN, content: () => supplies });
  }

  return renderInRoot(
    <IntegrationContextWrapper onSave={vi.fn()} autoSave={false}>
      {ui}
      {via === 'app tree' ? (
        supplies
      ) : (
        <PluginSupplySource>
          <OptionalAppChildren />
        </PluginSupplySource>
      )}
      {after}
    </IntegrationContextWrapper>,
    { builtInControls },
  );
}

export function removeSuppliesPlugin() {
  // Registering a name again replaces the entry, and an entry without content renders nothing.
  registerComponentDecorator('OptionalAppChildren', { name: PLUGIN });
}
