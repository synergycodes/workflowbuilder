import { PlusCircle } from '@phosphor-icons/react';
import { Button } from '@workflowbuilder/ui';

import styles from './placeholder-button.module.css';

type Props = {
  label: string;
} & Omit<React.ComponentProps<typeof Button>, 'children'>;

export function PlaceholderButton({ label, size = 'xs', ...props }: Props) {
  return (
    <Button
      className={styles['placeholder-button']}
      size={size}
      variant="ghost-secondary"
      prefixIcon={<PlusCircle weight="bold" />}
      {...props}
    >
      {label}
    </Button>
  );
}
