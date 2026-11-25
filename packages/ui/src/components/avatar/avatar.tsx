import clsx from 'clsx';

import styles from './avatar.module.css';

import type { Size } from '../../shared/types/size';

/**
 * Size of an `Avatar`, from `s` up to `xl`.
 *
 * @category Avatar
 */
export type AvatarSize = Extract<Size, 's' | 'm' | 'l' | 'xl'>;

export type AvatarProps = {
  /**
   * Provide to use it as alt of the image for better a11y
   */
  username: string;
  /**
   * Image URL
   */
  imageUrl?: string;
  /**
   * Size of the circle container
   * @default 'xl'
   */
  size?: AvatarSize;
};

/**
 * Component for displaying user avatars with various sizes
 */
export function Avatar({ imageUrl, username, size = 'xl' }: AvatarProps) {
  return (
    <div className={clsx(styles['container'], styles[size])}>
      <img src={imageUrl} alt={username} />
    </div>
  );
}
