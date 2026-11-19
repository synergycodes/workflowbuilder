import pencilSimpleLineIcon from '@iconify-icons/ph/pencil-simple-line';
import pencilSimpleSlashIcon from '@iconify-icons/ph/pencil-simple-slash';
import { SegmentPicker } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { Icon } from '../../../../icon/icon';
import { useStore } from '../../../../store/store';

export function ToggleReadyOnlyMode() {
  const { t } = useTranslation();
  const isReadOnly = useStore((store) => store.isReadOnly);
  const { setReadOnly } = useWorkflowBuilderActions();

  return (
    <SegmentPicker
      size="extra-small"
      variant="secondary"
      value={isReadOnly ? 'read-only' : 'edit'}
      onChange={(_event, value) => setReadOnly(value === 'read-only')}
    >
      <SegmentPicker.Item
        value="edit"
        aria-label={t('header.mode.edit')}
        tooltip={t('header.mode.edit')}
        prefixIcon={<Icon icon={pencilSimpleLineIcon} size="inherit" />}
      />
      <SegmentPicker.Item
        value="read-only"
        aria-label={t('header.mode.readOnly')}
        tooltip={t('header.mode.readOnly')}
        prefixIcon={<Icon icon={pencilSimpleSlashIcon} size="inherit" />}
      />
    </SegmentPicker>
  );
}
