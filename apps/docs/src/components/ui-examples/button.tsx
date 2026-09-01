import { Plus, X } from '@phosphor-icons/react';
import { Button } from '@workflowbuilder/ui';

import styles from './button.module.css';

import { ComponentPreview } from './component-preview';

const SOLID_VARIANTS = ['primary', 'secondary', 'critical', 'success', 'warning'] as const;
const GHOST_VARIANTS = [
  'ghost-primary',
  'ghost-secondary',
  'ghost-critical',
  'ghost-success',
  'ghost-warning',
] as const;

export function ButtonExample() {
  return (
    <ComponentPreview>
      <div className={styles['example']}>
        <div className={styles['row']}>
          {SOLID_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} size="m">
              {variant}
            </Button>
          ))}
        </div>
        <div className={styles['row']}>
          {GHOST_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} size="m">
              {variant}
            </Button>
          ))}
        </div>
        <div className={styles['row']}>
          <Button shape="square" prefixIcon={<Plus />} aria-label="Add" />
          <Button shape="round" prefixIcon={<X />} aria-label="Close" />
          <Button isLoading>Loading</Button>
        </div>
      </div>
    </ComponentPreview>
  );
}
