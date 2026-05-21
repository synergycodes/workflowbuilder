import { PlusCircle } from '@phosphor-icons/react';
import { Button } from '@synergycodes/overflow-ui';

import styles from './placeholder-button.module.css';

type Props = {
  label: string;
} & Omit<React.ComponentProps<typeof Button>, 'children'>;

export function PlaceholderButton({ label, size = 'extra-small', ...props }: Props) {
  return (
    <Button className={styles['placeholder-button']} size={size} variant="secondary" {...props}>
      <PlusCircle weight="bold" />
      {label}
    </Button>
  );
}
