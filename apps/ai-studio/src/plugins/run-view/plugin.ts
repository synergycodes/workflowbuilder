import { registerComponentDecorator } from '@workflowbuilder/sdk';

// The editor's Save button is also where autosave and the save on close live, so hiding it stops all three.
const Nothing = () => null;

export function plugin(): void {
  registerComponentDecorator('OptionalAppBarTools', {
    name: 'run-view-hides-save',
    place: 'wrapper',
    content: Nothing,
  });
}
