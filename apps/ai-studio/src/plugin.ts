import { type OptionalNodeContent, registerComponentDecorator } from '@workflowbuilder/sdk';

import { ErrorHandle } from './components/error-handle/error-handle';
import { ExecutionNodeMarkers } from './components/execution/node-markers';

type OptionalNodeContentProps = React.ComponentProps<typeof OptionalNodeContent>;

export function plugin(): void {
  registerComponentDecorator<OptionalNodeContentProps>('OptionalNodeContent', {
    content: ExecutionNodeMarkers,
  });
  registerComponentDecorator<OptionalNodeContentProps>('OptionalNodeContent', {
    content: ErrorHandle,
    place: 'after',
  });
}
