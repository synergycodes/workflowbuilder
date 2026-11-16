import { Chip } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import styles from '../../app-bar.module.css';

import { useStore } from '../../../../store/store';
import { useAppBar } from '../../app-bar-context';

export function VersionChip() {
  const { t } = useTranslation();
  const { version } = useAppBar();
  const isEmptyCanvas = useStore((state) => state.nodes.length === 0);

  if (!version || isEmptyCanvas) {
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
