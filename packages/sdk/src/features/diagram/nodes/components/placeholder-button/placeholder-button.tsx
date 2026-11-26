import plusCircleBoldIcon from '@iconify-icons/ph/plus-circle-bold';
import { Button, type LabelButtonProps } from '@workflowbuilder/ui';

import { Icon } from '../../../../../icon/icon';

type Props = {
  label: string;
} & Omit<LabelButtonProps, 'children'>;

export function PlaceholderButton({ label, size = 'xs', ...props }: Props) {
  return (
    <Button
      size={size}
      variant="ghost-secondary"
      prefixIcon={<Icon icon={plusCircleBoldIcon} size="inherit" />}
      {...props}
    >
      {label}
    </Button>
  );
}
