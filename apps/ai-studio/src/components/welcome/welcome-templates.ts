import { ArrowsSplit, HandCoins, type Icon, ListChecks, MagnifyingGlass, Scales, Tray } from '@phosphor-icons/react';
import type { TemplateModel } from '@workflowbuilder/sdk';

import { aiDebateFlow } from '../../data/ai-debate-flow';
import { contentRepurposerFlow } from '../../data/content-repurposer-flow';
import { meetingNotesFlow } from '../../data/meeting-notes-flow';
import { refundReviewFlow } from '../../data/refund-review-flow';
import { researchFlow } from '../../data/research-flow';
import { supportTriageFlow } from '../../data/support-triage-flow';

// The colour family of the flow's key block, as the node icon tiles colour them.
export type TemplateCategory = 'action' | 'human' | 'logic' | 'trigger';

type WelcomeTemplate = {
  template: TemplateModel;
  description: string;
  icon: Icon;
  category: TemplateCategory;
  recommended?: boolean;
};

// Recommended first, then by relevance; Empty canvas is added after these by the modal.
export const welcomeTemplates: WelcomeTemplate[] = [
  {
    template: refundReviewFlow,
    description: 'AI prepares the refund, a human reviews it, then payout and email.',
    icon: HandCoins,
    category: 'human',
    recommended: true,
  },
  {
    template: supportTriageFlow,
    description: 'Classifies tickets, routes them by type and drafts a reply.',
    icon: Tray,
    category: 'trigger',
  },
  {
    template: aiDebateFlow,
    description: 'Optimist and Skeptic argue both sides, a judge gives a verdict.',
    icon: Scales,
    category: 'action',
  },
  {
    template: contentRepurposerFlow,
    description: 'Turns one source into a thread, a LinkedIn post and a caption.',
    icon: ArrowsSplit,
    category: 'logic',
  },
  {
    template: meetingNotesFlow,
    description: 'Summarizes a transcript and pulls out owners, tasks and due dates.',
    icon: ListChecks,
    category: 'action',
  },
  {
    template: researchFlow,
    description: 'Searches the web on a topic and writes a short, sourced brief.',
    icon: MagnifyingGlass,
    category: 'action',
  },
];
