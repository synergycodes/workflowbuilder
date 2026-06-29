import { registerComponentDecorator } from '@workflowbuilder/sdk';
import type { DiagramContainerProps } from '@workflowbuilder/sdk';

import { Watermark } from './components/watermark/watermark';

export function plugin(): void {
  registerComponentDecorator<DiagramContainerProps>('DiagramContainer', {
    content: Watermark,
    // Render after the canvas so the watermark paints above nodes/edges,
    // while `z-index: 0` keeps it below the side panels (z-index: 1).
    place: 'after',
  });
}
