import clsx from 'clsx';

import styles from './avatar.module.css';

type Props = {
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
   */
  size?: Size;
};

type Size = 'extra-large' | 'large' | 'medium' | 'small';

/**
 * Component for displaying user avatars with various sizes
 */
export function Avatar({ imageUrl, username, size = 'extra-large' }: Props) {
  return (
    <div className={clsx(styles['container'], styles[size])}>
      <img src={imageUrl} alt={username} />
    </div>
  );
}
