import { registerComponentDecorator } from '@workflowbuilder/sdk';
import type { DiagramContainerProps } from '@workflowbuilder/sdk';

import { Watermark } from './components/watermark/watermark';

export function plugin(): void {
  registerComponentDecorator<DiagramContainerProps>('DiagramContainer', {
    content: Watermark,
  });
}
