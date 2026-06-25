import type { TemplateModel } from '@workflowbuilder/sdk';

import { aiDebateFlow } from './ai-debate-flow';
import { contentRepurposerFlow } from './content-repurposer-flow';
import { meetingNotesFlow } from './meeting-notes-flow';
import { researchFlow } from './research-flow';
import { supportTriageFlow } from './support-triage-flow';

export const aiStudioTemplates: TemplateModel[] = [
  supportTriageFlow,
  aiDebateFlow,
  contentRepurposerFlow,
  meetingNotesFlow,
  researchFlow,
];
