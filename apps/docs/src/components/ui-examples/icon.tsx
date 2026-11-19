import gearIcon from '@iconify-icons/ph/gear';
import lightningIcon from '@iconify-icons/ph/lightning';
import { Icon } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function IconExample() {
  return (
    <ComponentPreview>
      <span style={{ display: 'inline-flex', gap: '1rem', fontSize: '1.5rem' }}>
        <Icon icon={lightningIcon} />
        <Icon icon={gearIcon} style={{ color: 'var(--wb-ds-ui-text-action-default)' }} />
      </span>
    </ComponentPreview>
  );
}
