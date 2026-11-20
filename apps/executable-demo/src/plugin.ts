import { type OptionalNodeContent, registerComponentDecorator } from '@workflowbuilder/sdk';

import { ExecutionNodeMarkers } from './components/execution/execution-node-markers';

type OptionalNodeContentProps = React.ComponentProps<typeof OptionalNodeContent>;

export function plugin(): void {
  registerComponentDecorator<OptionalNodeContentProps>('OptionalNodeContent', {
    content: ExecutionNodeMarkers,
  });
}
