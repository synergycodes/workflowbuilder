import clsx from 'clsx';

import styles from './avatar.module.css';

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
   * @default 'extra-large'
   */
  size?: Size;
};

type Size = 'extra-large' | 'large' | 'medium' | 'small';

/**
 * Component for displaying user avatars with various sizes
 */
export function Avatar({ imageUrl, username, size = 'extra-large' }: AvatarProps) {
  return (
    <div className={clsx(styles['container'], styles[size])}>
      <img src={imageUrl} alt={username} />
    </div>
  );
}
