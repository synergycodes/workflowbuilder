import { Chip } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import styles from '../../app-bar.module.css';

import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { useHeaderSupply } from '../../../ui-extensions/ui-extension-context';

export function VersionChip() {
  const { t } = useTranslation();
  const isVisible = useIsBuiltInControlVisible('version');
  const version = useHeaderSupply('version');

  if (!isVisible || !version) {
    return null;
  }

  return (
    <Chip
      size="l"
      className={styles['version-chip']}
      label={t(version.isDraft ? 'header.version.draft' : 'header.version.published', { number: version.number })}
    />
  );
}
