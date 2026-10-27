import { registerComponentDecorator } from '@workflowbuilder/sdk';

import './execution.css';

import { NodeRunMarker } from './node-markers';
import { RunButton } from './run-button';
import { RunPanel } from './run-panel';

export function executionPlugin(): void {
  // OptionalAppChildren mounts RunButton once; EditorHeaderControlsContent inside it puts the button
  // in the editor header.
  registerComponentDecorator('OptionalAppChildren', { content: RunButton, name: 'run-on-temporal' });
  registerComponentDecorator('OptionalAppChildren', { content: RunPanel, name: 'run-panel' });
  registerComponentDecorator('OptionalNodeContent', { content: NodeRunMarker, place: 'after', name: 'run-markers' });
}
