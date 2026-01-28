import { PropsWithChildren } from 'react';

import { withOptionalComponentPlugins } from '../../adapters/adapter-components';

type Props = {
  nodeId: string;
};

function OptionalWrapper({ children }: PropsWithChildren<Props>) {
  return children;
}

export const OptionalNodeContent = withOptionalComponentPlugins(OptionalWrapper, 'OptionalNodeContent');
