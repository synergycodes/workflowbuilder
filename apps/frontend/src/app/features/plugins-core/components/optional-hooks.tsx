import { withOptionalComponentPlugins } from '../adapters/adapter-components';

function OptionalHooksComponent() {
  return null;
}

export const OptionalHooks = withOptionalComponentPlugins(OptionalHooksComponent, 'OptionalHooks');
