import type { PropsWithChildren } from 'react';

import { withOptionalComponentPlugins } from '../../adapters/adapter-components';

type Props = {
  nodeId: string;
};

function OptionalWrapper({ children }: PropsWithChildren<Props>) {
  return children;
}

/**
 * Plugin slot mounted inside every node body. By default renders its
 * children unchanged; plugins can attach extra UI here via
 * {@link registerComponentDecorator} keyed `'OptionalNodeContent'`.
 *
 * The slot receives `nodeId` so decorators can scope their content to
 * specific nodes (e.g. show a status badge only on certain types).
 *
 * @category Components
 */
export const OptionalNodeContent = withOptionalComponentPlugins(OptionalWrapper, 'OptionalNodeContent');
