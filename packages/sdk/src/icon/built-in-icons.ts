import databaseIcon from '@iconify-icons/ph/database';
import gearIcon from '@iconify-icons/ph/gear';
import googleLogoIcon from '@iconify-icons/ph/google-logo';
import microsoftExcelLogoIcon from '@iconify-icons/ph/microsoft-excel-logo';
import openAiLogoIcon from '@iconify-icons/ph/open-ai-logo';
import slackLogoIcon from '@iconify-icons/ph/slack-logo';

import {
  aiAgentIcon,
  airtableLogoIcon,
  claudeLogoIcon,
  geminiLogoIcon,
  hubspotLogoIcon,
  jiraLogoIcon,
  statusActiveIcon,
  statusDisabledIcon,
  statusDraftIcon,
} from './custom-glyphs';
import type { IconSet } from './icon-registry';

/** Icons the SDK's own data refers to by name: built-in select options, node statuses and the global variables group. */
export const builtInIcons = {
  AiAgent: aiAgentIcon,
  AirtableLogo: airtableLogoIcon,
  ClaudeLogo: claudeLogoIcon,
  Database: databaseIcon,
  GeminiLogo: geminiLogoIcon,
  Gear: gearIcon,
  GoogleLogo: googleLogoIcon,
  HubspotLogo: hubspotLogoIcon,
  JiraLogo: jiraLogoIcon,
  MicrosoftExcelLogo: microsoftExcelLogoIcon,
  OpenAiLogo: openAiLogoIcon,
  SlackLogo: slackLogoIcon,
  StatusActive: statusActiveIcon,
  StatusDisabled: statusDisabledIcon,
  StatusDraft: statusDraftIcon,
} satisfies IconSet;
