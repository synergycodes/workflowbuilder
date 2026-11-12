import type { WorkflowBuilderLoadContext } from '@workflowbuilder/sdk';

import { hasSeenWelcome, openTemplatePicker } from './template-picker-store';

// These replace the SDK's default onLoad, which opens the SDK's own template selector over an empty diagram.

// Welcome greets the first open of AI Studio only; after that the Templates button is the way back to the templates.
export function onLocalLoad({ loadFailed }: WorkflowBuilderLoadContext) {
  if (!loadFailed && !hasSeenWelcome()) openTemplatePicker('welcome');
}

// A stored workflow or a run opens without the picker: Welcome belongs to the first open of the editor itself.
export function onLinkLoad() {}
