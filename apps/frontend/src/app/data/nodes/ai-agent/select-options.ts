import { ItemOption } from '@workflow-builder/types/node-schema';
export const toolOptions = {
  gmail: { label: 'Gmail', value: 'gmail', icon: 'GoogleLogo' },
  excel: { label: 'Excel', value: 'excel', icon: 'MicrosoftExcelLogo' },
  airtable: { label: 'Airtable', value: 'airtable', icon: 'AirtableLogo' },
  jira: { label: 'Jira', value: 'jira', icon: 'JiraLogo' },
  slack: { label: 'Slack', value: 'slack', icon: 'SlackLogo' },
  hubspot: { label: 'Hubspot', value: 'hubspot', icon: 'HubspotLogo' },
} as Record<string, ItemOption>;

export const chatModelOptions = {
  gpt: { label: 'GPT-4', value: 'gpt40', icon: 'OpenAiLogo' },
  gemini: { label: 'Gemini 2.5 Pro', value: 'gemini2.5pro', icon: 'GeminiLogo' },
  claude: { label: 'Claude 3.7 Sonet', value: 'claude3.7sonet', icon: 'ClaudeLogo' },
} as Record<string, ItemOption>;

export const memoryOptions = {
  system: { label: 'Windows System Memory', value: 'system', icon: 'Database' },
} as Record<string, ItemOption>;
