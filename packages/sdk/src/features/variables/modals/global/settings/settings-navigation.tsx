import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import styles from './settings-navigation.module.css';

import { SETTINGS_TABS, type SettingsTab } from '../constants';

type Props = {
  className?: string;
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
};

export function SettingsNavigation({ className = '', activeTab, setActiveTab }: Props) {
  const { t } = useTranslation();

  return (
    <aside className={clsx(styles['container'], className)}>
      {Object.values(SETTINGS_TABS).map((settingTab) => (
        <button
          className={clsx(styles['button'], {
            [styles['button--active']]: activeTab === settingTab,
          })}
          key={settingTab}
          onClick={() => setActiveTab(settingTab)}
        >
          {t(`workflowsSettings.tab.${settingTab}`)}
        </button>
      ))}
    </aside>
  );
}
