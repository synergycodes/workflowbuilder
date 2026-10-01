import { registerComponentDecorator } from '@workflowbuilder/sdk';

import './execution.css';

import { NodeRunMarker } from './node-markers';
import { RunButton } from './run-button';

export function executionPlugin(): void {
  registerComponentDecorator('OptionalAppBarControls', {
    content: RunButton,
    place: 'before',
    name: 'run-on-temporal',
  });
  registerComponentDecorator('OptionalNodeContent', { content: NodeRunMarker, place: 'after', name: 'run-markers' });
}
