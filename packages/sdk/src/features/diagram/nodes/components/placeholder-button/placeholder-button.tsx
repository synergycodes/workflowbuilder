import { PlusCircle } from '@phosphor-icons/react';
import { Button, type LabelButtonProps } from '@workflowbuilder/ui';

type Props = {
  label: string;
} & Omit<LabelButtonProps, 'children'>;

export function PlaceholderButton({ label, size = 'xs', ...props }: Props) {
  return (
    <Button size={size} variant="ghost-secondary" prefixIcon={<PlusCircle weight="bold" />} {...props}>
      {label}
    </Button>
  );
}
