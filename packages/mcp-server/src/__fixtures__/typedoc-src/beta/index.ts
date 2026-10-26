/** Same name in two packages, const here. */
export const Shared = 42;

/** Props of the button. */
export interface ButtonProps {
  /** Visual variant. */
  variant: 'primary' | 'secondary';
}

/** A button component. */
export const Button = (props: ButtonProps) => props.variant;
