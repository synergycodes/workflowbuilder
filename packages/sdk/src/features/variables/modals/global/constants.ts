export const SETTINGS_TABS = {
  GENERAL: 'general',
  GLOBAL_VARIABLES: 'globalVariables',
} as const;

export type SettingsTab = (typeof SETTINGS_TABS)[keyof typeof SETTINGS_TABS];
