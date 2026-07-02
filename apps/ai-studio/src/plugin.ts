import { type OptionalNodeContent, registerComponentDecorator } from '@workflowbuilder/sdk';

import { ExecutionNodeMarkers } from './components/execution/node-markers';
import { VisualizeCard } from './components/visualize/visualize-card';

type OptionalNodeContentProps = React.ComponentProps<typeof OptionalNodeContent>;

export function plugin(): void {
  registerComponentDecorator<OptionalNodeContentProps>('OptionalNodeContent', {
    content: ExecutionNodeMarkers,
  });
  registerComponentDecorator<OptionalNodeContentProps>('OptionalNodeContent', {
    content: VisualizeCard,
    place: 'after',
  });
}
