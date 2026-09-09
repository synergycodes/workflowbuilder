import { SETTINGS_TABS, type SettingsTab } from '../constants';
import { TabGeneral } from '../tab-general/tab-general';
import { TabGlobalVariables } from '../tab-global-variables/tab-global-variables';

type Props = {
  activeTab: SettingsTab;
  isReadOnly?: boolean;
};

const contentByTab: Record<SettingsTab, React.ComponentType<{ isReadOnly?: boolean }>> = {
  [SETTINGS_TABS.GENERAL]: TabGeneral,
  [SETTINGS_TABS.GLOBAL_VARIABLES]: TabGlobalVariables,
};

export function TabActive({ activeTab, isReadOnly }: Props) {
  const Content = contentByTab[activeTab];

  return <Content isReadOnly={isReadOnly} />;
}
