import { PropsWithChildren } from 'react';
import { withOptionalComponentPlugins } from '../adapters/adapter-components';

function OptionalWrapper({ children }: PropsWithChildren) {
  return children;
}

export const OptionalFooterContent = withOptionalComponentPlugins(OptionalWrapper, 'OptionalFooterContent');
