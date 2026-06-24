import { TooltipVariant } from '../tooltip/types';

export type Shape = '' | 'circle';

export type IconNode = React.ReactElement;

export type BaseButtonProps = {
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
