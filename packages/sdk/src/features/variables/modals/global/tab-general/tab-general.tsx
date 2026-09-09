import clsx from 'clsx';

import styles from './tab-general.module.css';

import { ToggleDarkMode } from '../../../../app-bar/components/toggle-dark-mode/toggle-dark-mode';
import { TabHeader } from '../tab/tab-header';

type Props = {
  className?: string;
  isReadOnly?: boolean;
};

export function TabGeneral({ className }: Props) {
  return (
    <div className={clsx(styles['container'], className)}>
      <TabHeader title="workflowsSettings.tab.general" description="workflowsSettings.tab.generalDescription" />
      <div className={styles['content']}>
        <ToggleDarkMode />
      </div>
    </div>
  );
}
