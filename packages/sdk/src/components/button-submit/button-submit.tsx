import { Spinner } from '@phosphor-icons/react';
import { Button } from '@workflowbuilder/ui';
import clsx from 'clsx';

import styles from './button-submit.module.css';

type Props = Omit<React.ComponentProps<typeof Button>, 'children'> & {
  classNameWrapper?: string;
  isPending: boolean;
  children: React.ReactNode;
};

export function ButtonSubmit({ classNameWrapper = '', isPending = false, children, ...buttonProps }: Props) {
  return (
    <span
      className={clsx(
        styles['container'],
        {
          [styles['container--pending']]: isPending,
          [styles[`container--${buttonProps.variant}`]]: buttonProps.variant,
        },
        classNameWrapper,
      )}
    >
      {/* @ts-expect-error The rules for children are complex, and there is no easy way to pass them to a wrapper. */}
      <Button {...buttonProps}>{children}</Button>
      {isPending && <Spinner className={styles['icon--spinner']} />}
    </span>
  );
}
