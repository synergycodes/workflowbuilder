import { PencilSimpleLine, PencilSimpleSlash } from '@phosphor-icons/react';
import { SegmentPicker } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { useStore } from '../../../../store/store';

export function ToggleReadyOnlyMode() {
  const { t } = useTranslation();
  const isReadOnly = useStore((store) => store.isReadOnly);
  const setReadOnly = useStore((store) => store.setReadOnly);

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
        prefixIcon={<PencilSimpleLine />}
      />
      <SegmentPicker.Item
        value="read-only"
        aria-label={t('header.mode.readOnly')}
        tooltip={t('header.mode.readOnly')}
        prefixIcon={<PencilSimpleSlash />}
      />
    </SegmentPicker>
  );
}
