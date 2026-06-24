import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

export function TooltipExample() {
  return (
    <div className={frame.frame}>
      <Tooltip placement="top">
        <TooltipTrigger asChild>
          <Button variant="secondary">Hover for tooltip</Button>
        </TooltipTrigger>
        <TooltipContent tooltipType="default">Default tooltip</TooltipContent>
      </Tooltip>
      <Tooltip placement="top">
        <TooltipTrigger asChild>
          <Button variant="secondary">Hover for blue</Button>
        </TooltipTrigger>
        <TooltipContent tooltipType="blue">Blue tooltip</TooltipContent>
      </Tooltip>
    </div>
  );
}
