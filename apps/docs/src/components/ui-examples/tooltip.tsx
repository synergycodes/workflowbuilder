import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function TooltipExample() {
  return (
    <ComponentPreview>
      <Tooltip placement="top">
        <TooltipTrigger asChild>
          <Button variant="secondary">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent tooltipType="default">Tooltip</TooltipContent>
      </Tooltip>
    </ComponentPreview>
  );
}
