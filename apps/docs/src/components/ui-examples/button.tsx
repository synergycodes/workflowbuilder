import { Plus, X } from '@phosphor-icons/react';
import { Button } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

const SOLID_VARIANTS = ['primary', 'secondary', 'critical', 'success'] as const;
const GHOST_VARIANTS = ['ghost-primary', 'ghost-secondary', 'ghost-critical', 'ghost-success'] as const;

export function ButtonExample() {
  return (
    <ComponentPreview>
      <ComponentPreview.Stack>
        <ComponentPreview.Row>
          {SOLID_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} size="m">
              {variant}
            </Button>
          ))}
        </ComponentPreview.Row>
        <ComponentPreview.Row>
          {GHOST_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} size="m">
              {variant}
            </Button>
          ))}
        </ComponentPreview.Row>
        <ComponentPreview.Row>
          <Button shape="square" prefixIcon={<Plus />} aria-label="Add" />
          <Button shape="round" prefixIcon={<X />} aria-label="Close" />
          <Button isLoading>Loading</Button>
        </ComponentPreview.Row>
      </ComponentPreview.Stack>
    </ComponentPreview>
  );
}
