import { type OptionalNodeContent, type PropertiesBarProps, registerComponentDecorator } from '@workflowbuilder/sdk';

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
  // The panel's footer holds the decision actions; deleting stays on the Delete and Backspace keys.
  registerComponentDecorator<PropertiesBarProps>('PropertiesBar', {
    name: 'ai-studio-no-delete-button',
    modifyProps: (props) => ({ ...props, onDeleteClick: undefined }),
  });
}
