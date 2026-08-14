import styles from './separator.module.css';

/**
 * A visual separator component that creates a horizontal line to divide content.
 */
export function Separator() {
  return <hr className={styles['separator']} />;
}
