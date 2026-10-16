import { OptionalNodeContent, registerComponentDecorator } from '@workflowbuilder/sdk';

import NodeVariablesPreviewToggle from './components/node-variables-toggle';

type OptionalNodeContentProps = React.ComponentProps<typeof OptionalNodeContent>;

export function plugin(): void {
  registerComponentDecorator<OptionalNodeContentProps>('OptionalNodeContent', {
    content: NodeVariablesPreviewToggle,
  });
}
