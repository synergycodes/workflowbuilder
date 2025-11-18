import clsx from 'clsx';
import styles from './sidebar.module.css';
import './variables.css';

import { Separator } from '@synergycodes/overflow-ui';

type SidebarProps = React.HTMLAttributes<HTMLDivElement> & {
  isExpanded: boolean;
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
};

export function Sidebar({ isExpanded, children, className, header, footer, contentClassName, ...props }: SidebarProps) {
  return (
    <div className={clsx(styles.sidebar, { [styles.expanded]: isExpanded }, className)} {...props}>
      <div className={styles.header}>{header}</div>
      {isExpanded && (
        <>
          <Separator />
          <div className={clsx(styles.content, contentClassName)}>{children}</div>
          {footer && (
            <>
              <Separator />
              <div className={styles.footer}>{footer}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
