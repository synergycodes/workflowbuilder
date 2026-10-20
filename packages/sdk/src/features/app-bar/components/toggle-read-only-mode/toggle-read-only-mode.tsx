import { PencilSimpleLine, PencilSimpleSlash } from '@phosphor-icons/react';
import { SegmentPicker } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import { useStore } from '../../../../store/store';

export function ToggleReadyOnlyMode() {
  const { t } = useTranslation();
  const isReadOnlyMode = useStore((store) => store.isReadOnlyMode);
  const setToggleReadOnlyMode = useStore((store) => store.setToggleReadOnlyMode);

  return (
    <SegmentPicker
      size="extra-small"
      variant="secondary"
      value={isReadOnlyMode ? 'read-only' : 'edit'}
      onChange={(_event, value) => setToggleReadOnlyMode(value === 'read-only')}
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
