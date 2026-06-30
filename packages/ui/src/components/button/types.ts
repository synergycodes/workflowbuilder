import { TooltipVariant } from '../tooltip/types';

export type Shape = 'default' | 'circle';

export type IconNode = React.ReactElement;

export type BaseButtonProps = {
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
