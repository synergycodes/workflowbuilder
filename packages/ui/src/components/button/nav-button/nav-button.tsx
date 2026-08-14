import clsx from 'clsx';
import { ReactElement, forwardRef } from 'react';

import borderRadiusStyles from '../styles/border-radius.module.css';
import navBorderRadiusStyles from './styles/nav-button-border-radius.module.css';
import navButtonStyles from './styles/nav-button.module.css';

import { hasChildrenWithStringAndIcons, hasIconChildrenOnly, hasStringChildrenOnly } from '../guards';
import { NavIconButton, NavIconButtonProps } from './nav-icon-button/nav-icon-button';
import { NavIconLabelButton, NavIconLabelButtonProps } from './nav-icon-label-button/nav-icon-label-button';
import { NavLabelButton, NavLabelButtonProps } from './nav-label-button/nav-label-button';

type WithRef<T> = T & {
  ref?: React.Ref<HTMLButtonElement>;
};

/**
 * NavButtonProps defines **discriminated overloads** for the Button component using
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
type NavButtonProps = {
  (props: WithRef<NavLabelButtonProps>): ReactElement;
  (props: WithRef<NavIconButtonProps>): ReactElement;
  (props: WithRef<NavIconLabelButtonProps>): ReactElement;
};

const NavButtonComponent = forwardRef<
  HTMLButtonElement,
  NavLabelButtonProps | NavIconButtonProps | NavIconLabelButtonProps
>(({ className, isSelected, size = 'medium', ...props }, ref) => {
  const buttonProps = {
    ref,
    ...props,
    className: clsx(
      borderRadiusStyles[size],
      navBorderRadiusStyles[size],
      navButtonStyles['nav-button'],
      { [navButtonStyles['selected']]: isSelected },
      className,
    ),
    size,
  };

  if (hasStringChildrenOnly<NavLabelButtonProps>(props)) {
    return <NavLabelButton {...buttonProps}>{props.children}</NavLabelButton>;
  }

  if (hasIconChildrenOnly<NavIconButtonProps>(props)) {
    return <NavIconButton {...buttonProps}>{props.children}</NavIconButton>;
  }

  if (hasChildrenWithStringAndIcons<NavIconLabelButtonProps>(props)) {
    return <NavIconLabelButton {...buttonProps}>{props.children}</NavIconLabelButton>;
  }

  return null;
});

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
 * <NavButton>Submit</NavButton> // Label Button
 *
 * <NavButton>
 *   <Icon/>
 * </NavButton> // Icon Button
 *
 * <NavButton>
 *   <Icon />
 *   Confirm
 *   <Icon />
 * </NavButton> // Icon Label Button
 * ```
 *
 * This approach ensures:
 * - Simplified usage with fewer props
 * - No accidental mixing of incompatible props
 * - Autocomplete and type-checking experience
 */
export const NavButton = NavButtonComponent as NavButtonProps;
