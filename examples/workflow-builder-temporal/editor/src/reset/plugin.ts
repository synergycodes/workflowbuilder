import { registerComponentDecorator } from '@workflowbuilder/sdk';

import './reset.css';

import { ResetButton } from './reset-button';

export function resetPlugin(): void {
  registerComponentDecorator('OptionalAppBarControls', {
    content: ResetButton,
    place: 'before',
    name: 'reset-diagram',
  });
}
