import { Switch as SwitchBase } from '@base-ui/react/switch';
import { SelectorSize } from '@ui/shared/types/selector-size';
import clsx from 'clsx';

import switchStyles from './switch.module.css';

type SwitchRootProps = Omit<
  React.ComponentProps<typeof SwitchBase.Root>,
  'onCheckedChange' | 'render' | 'children' | 'className'
>;

export type BaseSwitchProps = {
  /**
   * Size of the switch component
   * @default 'medium'
   */
  size?: SelectorSize;
  /**
   * Custom content for the thumb of the switch
   */
  thumbChildren?: React.ReactNode;
  /**
   * Custom content for the track of the switch
   */
  trackChildren?: React.ReactNode;
  /**
   * Custom class name for the switch component
   */
  className?: string;
  /**
   * Whether the switch is checked or not
   */
  checked?: boolean;
  /**
   * Whether the switch is disabled
   */
  disabled?: boolean;
  /**
   * Callback function when the switch state changes
   */
  onChange?: (checked: boolean, event: Event) => void;
} & SwitchRootProps;

/**
 * A Switch component that allows users to toggle between two states, such as on and off.
 * Typically used for settings or preferences, it provides immediate visual feedback.
 */
export function Switch({
  size = 'medium',
  className,
  thumbChildren,
  trackChildren,
  onChange,
  ...props
}: BaseSwitchProps) {
  function handleCheckedChange(checked: boolean, eventDetails: { event: Event }) {
    onChange?.(checked, eventDetails.event);
  }

  return (
    <SwitchBase.Root
      onCheckedChange={handleCheckedChange}
      className={clsx(switchStyles['container'], switchStyles[size], className)}
      nativeButton={false}
      render={<span />}
      {...props}
    >
      {trackChildren ?? <span className={switchStyles['track']} />}
      <SwitchBase.Thumb
        className={clsx({ [switchStyles['thumb']]: !thumbChildren })}
        render={
          thumbChildren
            ? (thumbProps) => (
                <span {...thumbProps} className={clsx(thumbProps.className, switchStyles['thumb-contents'])} />
              )
            : undefined
        }
      >
        {thumbChildren}
      </SwitchBase.Thumb>
    </SwitchBase.Root>
  );
}
