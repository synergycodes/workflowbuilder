import { type OptionalNodeContent, registerComponentDecorator } from '@workflowbuilder/sdk';

import { EdgeRunPath } from './components/execution/edge-run-state';
import { NodeRunCorner, NodeRunHeaderEnd, NodeRunOverlay } from './components/execution/node-run-status';
import { VisualizeCard } from './components/visualize/visualize-card';

type OptionalNodeContentProps = React.ComponentProps<typeof OptionalNodeContent>;

export function plugin(): void {
  registerComponentDecorator('OptionalNodeOverlay', { content: NodeRunOverlay });
  registerComponentDecorator('OptionalNodeCorner', { content: NodeRunCorner, place: 'wrapper' });
  registerComponentDecorator('OptionalNodeHeaderEnd', { content: NodeRunHeaderEnd });
  // Highest priority wraps innermost, so re-rendering `component` keeps other wrappers around it.
  registerComponentDecorator('OptionalEdgePath', { content: EdgeRunPath, place: 'wrapper', priority: 100 });
  registerComponentDecorator<OptionalNodeContentProps>('OptionalNodeContent', {
    content: VisualizeCard,
    place: 'after',
  });
}
