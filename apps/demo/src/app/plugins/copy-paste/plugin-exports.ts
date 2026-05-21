import { registerComponentDecorator } from '@workflowbuilder/sdk';

import { CopyPasteProvider } from './providers/copy-paste-provider';

export function plugin(): void {
  registerComponentDecorator('OptionalHooks', {
    content: CopyPasteProvider,
    name: 'CopyPasteProvider',
  });
}
