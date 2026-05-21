import { SETTINGS_TABS, type SettingsTab } from '../constants';
import { TabGeneral } from '../tab-general/tab-general';
import { TabGlobalVariables } from '../tab-global-variables/tab-global-variables';

type Props = {
  activeTab: SettingsTab;
};

const contentByTab: Record<SettingsTab, React.ComponentType> = {
  [SETTINGS_TABS.GENERAL]: TabGeneral,
  [SETTINGS_TABS.GLOBAL_VARIABLES]: TabGlobalVariables,
};

export function TabActive({ activeTab }: Props) {
  const Content = contentByTab[activeTab];

  return <Content />;
}
