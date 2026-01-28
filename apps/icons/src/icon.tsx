import clsx from 'clsx';
import { Suspense } from 'react';

import styles from './icon.module.css';

import { type WBIcon, iconMap } from '../dist';

type IconProps = {
  name: WBIcon;
  size?: Size;
  color?: string;
} & React.SVGProps<SVGSVGElement>;

const fetchedIconsNames: {
  [name: string]: 'called' | 'fetched' | 'uncalled';
} = {};

/**
 * Updates the fade-in status by modifying a local cache.
 * While this approach is somewhat hacky due to direct cache mutation (inside clsx() call),
 * it allows us to avoid more complex logic just for determining fade-in behavior.
 */
function getShouldFadeIconWithCacheState(iconName: string) {
  const previousStatus = fetchedIconsNames[iconName] || 'uncalled';

  // React tried to render a component, triggering its lazy loading (it is showing a fallback now)
  if (previousStatus === 'uncalled') {
    fetchedIconsNames[iconName] = 'called';

    return true;
  }

  // Once the component fetch was resolved, a second re-render occurred (it is the first real display of the component)
  if (previousStatus === 'called') {
    fetchedIconsNames[iconName] = 'fetched';

    return true;
  }

  // All later calls don't need a fade-in because the component was already fetched.
  return false;
}

/**
 * Lazy loads an icon from the @phosphor-icons/core package with help of SVGR loader.
 * Can be easily extended to support other .svg sources.
 */
export function Icon({ name, size = 'medium', color = 'currentColor', ...properties }: IconProps) {
  const computedSize = iconSizeMap[size];

  const svgProps: Partial<IconProps> = {
    width: computedSize,
    height: computedSize,
    fill: color,
  };

  const Icon = iconMap[name];

  const iconProps = {
    ...svgProps,
    ...properties,
  } as IconProps;

  return (
    <Suspense fallback={<IconFallback size={size} />}>
      <Icon
        {...iconProps}
        className={clsx(
          {
            [styles['optional-icon-fade-in']]: getShouldFadeIconWithCacheState(name),
          },
          iconProps.className,
        )}
      />
    </Suspense>
  );
}

function IconFallback({ size = 'medium' }: Pick<IconProps, 'size'>) {
  const computedSize = iconSizeMap[size];

  return <svg width={computedSize} height={computedSize} />;
}

type Size = 'extra-large' | 'large' | 'medium' | 'small';
const iconSizeMap: Record<Size, string> = {
  small: '0.5rem',
  medium: '1rem',
  large: '1.5rem',
  'extra-large': '2rem',
};
