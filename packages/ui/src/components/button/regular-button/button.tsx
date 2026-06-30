import clsx from 'clsx';
import { ReactElement, forwardRef } from 'react';

import borderRadiusStyles from '../styles/border-radius.module.css';
import variantStyles from '../styles/variant.module.css';

import { hasChildrenWithStringAndIcons, hasIconChildrenOnly, hasStringChildrenOnly } from '../guards';
import { IconButton, IconButtonProps } from './icon-button/icon-button';
import { IconLabelButton, IconLabelButtonProps } from './icon-label-button/icon-label-button';
import { LabelButton, LabelButtonProps } from './label-button/label-button';

type WithRef<T> = T & {
  ref?: React.Ref<HTMLButtonElement>;
};

/**
 * ButtonProps defines **discriminated overloads** for the Button component using
 * **structural discrimination** rather than a `type` field.
 *
 * The component dynamically determines which button variant to render based on the
 * **structure of the `children` prop**:
 *
 * - If `children` is a single `string`, it's treated as a **Label Button**.
 * - If `children` is a single icon (ReactElement), it's treated as an **Icon Button**.
 * - If `children` includes both a string and one or two icons (before/after),
 *   it's treated as an **Icon Label Button**.
 *
 * Based on the inferred variant, **only props specific to that variant are allowed**.
 * This ensures that incorrect prop combinations (e.g., passing label-specific props
 * to an Icon Button) are caught at compile time.
 *
 * This is intentionally implemented with **overloads** instead of a union type,
 * which would incorrectly allow mixing props between types and compromise type safety.
 */
type ButtonProps = {
  (props: WithRef<LabelButtonProps>): ReactElement;
  (props: WithRef<IconButtonProps>): ReactElement;
  (props: WithRef<IconLabelButtonProps>): ReactElement;
};

const ButtonComponent = forwardRef<HTMLButtonElement, LabelButtonProps | IconButtonProps | IconLabelButtonProps>(
  ({ className, variant = 'primary', size = 'medium', ...props }, ref) => {
    const buttonProps = {
      ref,
      ...props,
      className: clsx(variantStyles[variant], borderRadiusStyles[size], className),
      variant,
      size,
    };

    if (hasStringChildrenOnly<LabelButtonProps>(props)) {
      return <LabelButton {...buttonProps}>{props.children}</LabelButton>;
    }

    if (hasIconChildrenOnly<IconButtonProps>(props)) {
      return <IconButton {...buttonProps}>{props.children}</IconButton>;
    }

    if (hasChildrenWithStringAndIcons<IconLabelButtonProps>(props)) {
      return <IconLabelButton {...buttonProps}>{props.children}</IconLabelButton>;
    }

    // The overloads only accept string / icon / icon + label children, so this is
    // unreachable for type-checked callers. It only fires for dynamic or `as any`
    // children that TS can't catch - fail loudly instead of silently rendering nothing.
    console.error(
      'Button: `children` did not match a supported variant (label, icon, or icon + label). Rendering nothing.',
    );
    return null;
  },
);

/**
 * Button is a flexible, and type-safe component that automatically selects
 * the correct type (Label Button, Icon Button, or Icon Label Button) based on the
 * structure of its `children` prop.
 *
 * **Automatic Type Selection (Structural Discrimination)**
 * The component uses the shape of `children` to infer which button variant to render:
 * - **Label Button**: If `children` is a single `string`
 * - **Icon Button**: If `children` is a single React element (e.g., an icon)
 * - **Icon Label Button**: If `children` is a combination of string + icon(s)
 *
 * **Type Safety via Overloads**
 * Each variant supports its own unique set of props. Thanks to TypeScript overloads,
 * only the correct props for a given structure are allowed—invalid combinations
 * are caught at compile time.
 *
 * **How to Use**
 *
 * ```tsx
 * <Button>Submit</Button> // Label Button
 *
 * <Button>
 *   <Icon/>
 * </Button> // Icon Button
 *
 * <Button>
 *   <Icon />
 *   Confirm
 *   <Icon />
 * </Button> // Icon Label Button
 * ```
 *
 * This approach ensures:
 * - Simplified usage with fewer props
 * - No accidental mixing of incompatible props
 * - Autocomplete and type-checking experience
 */
export const Button = ButtonComponent as ButtonProps;
