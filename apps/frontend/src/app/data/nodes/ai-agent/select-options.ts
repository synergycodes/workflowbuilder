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
  gpt: { label: 'GPT-5.4', value: 'gpt5.4', icon: 'OpenAiLogo' },
  gemini: { label: 'Gemini 3.1 Pro', value: 'gemini3.1pro', icon: 'GeminiLogo' },
  claude: { label: 'Claude Sonnet 4.6', value: 'claudeSonnet4.6', icon: 'ClaudeLogo' },
} as Record<string, ItemOption>;

export const memoryOptions = {
  system: { label: 'Window-based Memory', value: 'system', icon: 'Database' },
} as Record<string, ItemOption>;
