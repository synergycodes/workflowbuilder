import type { SVGProps } from 'react';

/**
 * Glyph data in the Iconify icon format, as exported by `@iconify-icons/*` packages:
 * the inner SVG markup and its view box.
 *
 * @category Icons
 */
export type IconData = {
  body: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
};

export type IconProps = { icon: IconData } & Omit<SVGProps<SVGSVGElement>, 'children' | 'dangerouslySetInnerHTML'>;

// Iconify leaves out width and height when they equal its default of 16.
const ICONIFY_DEFAULT_SIZE = 16;

/**
 * Renders icon data synchronously as an inline SVG sized to `1em` and colored with `currentColor`.
 *
 * @category Icons
 */
export function Icon({ icon, ...svgProps }: IconProps) {
  const { body, left = 0, top = 0, width = ICONIFY_DEFAULT_SIZE, height = ICONIFY_DEFAULT_SIZE } = icon;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${left} ${top} ${width} ${height}`}
      width="1em"
      height="1em"
      fill="currentColor"
      {...svgProps}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
