import i18n from 'i18next';
import { useCallback, useState } from 'react';

import { Icon } from '@workflow-builder/icons';

import styles from './modal-settings.module.css';

import { openModal } from '../../../features/modals/stores/use-modal-store';
import { SETTINGS_TABS, type SettingsTab } from './constants';
import { SettingsNavigation } from './settings/settings-navigation';
import { TabActive } from './tab/tab-active';

function ModalWorkflowSettings() {
  const [{ activeTab, lastPickedTimestamp }, setActiveTab] = useState<{
    activeTab: SettingsTab;
    lastPickedTimestamp: number;
  }>({
    activeTab: SETTINGS_TABS.GENERAL,
    lastPickedTimestamp: Date.now(),
  });

  const handleSetActiveTab = useCallback((tab: SettingsTab) => {
    setActiveTab({
      activeTab: tab,
      lastPickedTimestamp: Date.now(),
    });
  }, []);

  return (
    <div className={styles['container']}>
      <SettingsNavigation className={styles['navigation']} activeTab={activeTab} setActiveTab={handleSetActiveTab} />
      <div key={activeTab} className={styles['tabs']}>
        <TabActive key={lastPickedTimestamp} activeTab={activeTab} />
      </div>
    </div>
  );
}

export function openModalWorkflowSettings() {
  openModal({
    content: <ModalWorkflowSettings />,
    icon: <Icon name="Gear" />,
    title: i18n.t('workflowsSettings.modalTitle'),
  });
}
