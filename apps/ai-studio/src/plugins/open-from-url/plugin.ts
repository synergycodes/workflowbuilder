import { registerComponentDecorator } from '@workflowbuilder/sdk';

import { UrlModeAppBarTools } from '../../components/open-from-url/url-mode-app-bar-tools';

export function plugin(): void {
  registerComponentDecorator('OptionalAppBarTools', {
    name: 'open-from-url-tools',
    place: 'wrapper',
    content: UrlModeAppBarTools,
  });
}
