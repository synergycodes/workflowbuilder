import { type OptionalNodeContent, registerComponentDecorator } from '@workflowbuilder/sdk';

import { NodeRunCorner, NodeRunHeaderEnd, NodeRunOverlay } from './components/execution/node-run-status';
import { VisualizeCard } from './components/visualize/visualize-card';

type OptionalNodeContentProps = React.ComponentProps<typeof OptionalNodeContent>;

export function plugin(): void {
  registerComponentDecorator('OptionalNodeOverlay', { content: NodeRunOverlay });
  registerComponentDecorator('OptionalNodeCorner', { content: NodeRunCorner, place: 'wrapper' });
  registerComponentDecorator('OptionalNodeHeaderEnd', { content: NodeRunHeaderEnd });
  registerComponentDecorator<OptionalNodeContentProps>('OptionalNodeContent', {
    content: VisualizeCard,
    place: 'after',
  });
}
