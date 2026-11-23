import { type IconData, Icon as IconGlyph } from '@workflowbuilder/ui';
import { type SVGProps, useEffect } from 'react';

import { type WBIcon, findIcon } from './icon-registry';

type IconSize = 'extra-large' | 'large' | 'medium' | 'small' | 'inherit';

type IconSource =
  | {
      /** A built-in icon or one registered through `<WorkflowBuilder.Root icons>`. Use it where the name comes from data. */
      name: WBIcon;
      icon?: never;
    }
  | {
      /** Imported icon data, e.g. from `@iconify-icons/ph/gear`. Use it where the icon is fixed in code. */
      icon: IconData;
      name?: never;
    };

type IconProps = IconSource & {
  /** `inherit` follows the surrounding font-size, so a container such as `NodeIcon` sets the glyph size. */
  size?: IconSize;
  color?: string;
} & Omit<SVGProps<SVGSVGElement>, 'name' | 'children' | 'dangerouslySetInnerHTML'>;

const iconSizes: Record<IconSize, string> = {
  small: '0.5rem',
  medium: '1rem',
  large: '1.5rem',
  'extra-large': '2rem',
  inherit: '1em',
};

/**
 * Renders an icon synchronously, either by `name` or from imported `icon` data.
 * A name that is neither built in nor registered renders an empty placeholder of the same size and logs a warning.
 *
 * @category Icons
 */
export function Icon({ name, icon, size = 'medium', color, style, ...svgProps }: IconProps) {
  const data = icon ?? (name === undefined ? undefined : findIcon(name));

  useEffect(() => {
    if (name !== undefined && !data) warnMissingIcon(name);
  }, [name, data]);

  // `inherit` keeps the renderer's 1em attributes, so container CSS can still size the glyph.
  const sizeStyle = size === 'inherit' ? {} : { width: iconSizes[size], height: iconSizes[size] };

  if (!data) {
    return <svg aria-hidden width="1em" height="1em" style={{ ...sizeStyle, ...style }} {...svgProps} />;
  }

  // Iconify bodies paint with `currentColor` on their own shapes, so the color goes through CSS, not `fill`.
  // Without a `color` prop the inline style leaves color unset, so a container's `svg { color }` rule still applies.
  return <IconGlyph icon={data} style={{ ...sizeStyle, ...(color && { color }), ...style }} {...svgProps} />;
}

const warnedIconNames = new Set<string>();

function warnMissingIcon(name: string) {
  if (warnedIconNames.has(name)) return;
  warnedIconNames.add(name);
  console.warn(
    `[workflow-builder] Icon "${name}" is not registered. Add it to the icon set passed to <WorkflowBuilder.Root icons>.`,
  );
}
