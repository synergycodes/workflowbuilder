import { registerComponentDecorator } from '@workflowbuilder/sdk';

import './reset.css';

import { ResetButton } from './reset-button';

export function resetPlugin(): void {
  // Registered after the run plugin's button, so it stands to the right of Run in the editor header.
  registerComponentDecorator('OptionalAppChildren', { content: ResetButton, name: 'reset-diagram' });
}
