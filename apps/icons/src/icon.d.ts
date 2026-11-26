import { type WBIcon } from '../dist';

type IconProps = {
  name: WBIcon;
  /** `inherit` follows the surrounding font-size, so a container such as `NodeIcon` sets the glyph size. */
  size?: Size;
  color?: string;
} & React.SVGProps<SVGSVGElement>;
/**
 * Lazy loads an icon from the @phosphor-icons/core package with help of SVGR loader.
 * Can be easily extended to support other .svg sources.
 */
export declare function Icon({ name, size, color, ...properties }: IconProps): import('react/jsx-runtime').JSX.Element;
type Size = 'extra-large' | 'large' | 'medium' | 'small' | 'inherit';
export {};
