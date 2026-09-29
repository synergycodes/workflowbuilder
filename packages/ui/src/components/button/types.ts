import { TooltipVariant } from '../tooltip/types';

/**
 * Shape of the segments of a `SegmentPicker`.
 *
 * @category SegmentPicker
 */
export type Shape = 'default' | 'circle';

/**
 * An icon element for a button icon prop, e.g. `<Plus />`.
 *
 * @category Button
 */
export type IconNode = React.ReactElement;

/**
 * Props shared by every button: an optional tooltip plus the native `<button>` attributes.
 *
 * @category Button
 */
export type BaseButtonProps = {
  /** Text of a tooltip shown when the button is hovered or focused. */
  tooltip?: string;
  tooltipType?: TooltipVariant;
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
