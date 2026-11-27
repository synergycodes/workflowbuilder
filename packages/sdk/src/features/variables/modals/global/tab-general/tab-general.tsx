import clsx from 'clsx';

import styles from './tab-general.module.css';

import { ToggleDarkMode } from '../../../../app-bar/components/toggle-dark-mode/toggle-dark-mode';
import { useIsBuiltInControlVisible } from '../../../../ui-extensions/built-in-controls-context';
import { TabHeader } from '../tab/tab-header';

type Props = {
  className?: string;
  isReadOnly?: boolean;
};

export function TabGeneral({ className }: Props) {
  const isThemeToggleVisible = useIsBuiltInControlVisible('themeToggle');

  return (
    <div className={clsx(styles['container'], className)}>
      <TabHeader title="workflowsSettings.tab.general" description="workflowsSettings.tab.generalDescription" />
      <div className={styles['content']}>{isThemeToggleVisible && <ToggleDarkMode />}</div>
    </div>
  );
}
