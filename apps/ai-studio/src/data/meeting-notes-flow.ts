import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

const diagram: DiagramModel = {
  name: 'Meeting Notes to Action Items',
  diagram: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'start-node',
        position: { x: 0, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Meeting Transcript',
            description: 'A raw transcript pasted in.',
            inputPrompt: `[10:02] Priya: Okay, the launch date. Marketing wants the 14th, but the export bug is still open.
[10:03] Sam: Engineering can have the export fix in by the 11th if QA starts Monday.
[10:04] Priya: Works. Let's lock the 14th then. Sam, you own the fix.
[10:05] Dana: I'll prep the announcement email and the changelog - ready for review by the 12th.
[10:06] Priya: Great. And we still need pricing sign-off from finance before we announce.
[10:07] Sam: I'll ping finance today.`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/trigger',
          icon: 'Lightning',
        },
        selected: false,
        measured: { width: 258, height: 63 },
        dragging: false,
      },
      {
        id: 'summary-1',
        type: 'node',
        position: { x: 360, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Summarize',
            description: 'Condenses the discussion and decisions.',
            systemPrompt: `Summarize the meeting transcript in 3-4 sentences: what was discussed and what
was decided. Neutral, factual tone.`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'actions-1',
        type: 'node',
        position: { x: 720, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Extract Action Items',
            description: 'Pulls out owners, tasks and due dates.',
            systemPrompt: `From the meeting transcript, extract every action item as a list. For each item
give: owner, task, and due date if one was mentioned. If the owner is unclear,
mark it "unassigned". Do not invent items that were not discussed.`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'recap-1',
        type: 'node',
        position: { x: 1080, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Format Recap',
            description: 'Produces a clean recap email.',
            systemPrompt: `Produce a clean recap email:
- A one-paragraph summary of the meeting
- An "Action Items" section as a bulleted list with the owner in bold
Keep it tight and skimmable. Sign as "Meeting Bot".`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
    ],
    edges: [
      {
        source: 'trigger-1',
        sourceHandle: 'source',
        target: 'summary-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-summary',
        data: {},
      },
      {
        source: 'summary-1',
        sourceHandle: 'source',
        target: 'actions-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-summary-actions',
        data: {},
      },
      {
        source: 'actions-1',
        sourceHandle: 'source',
        target: 'recap-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-actions-recap',
        data: {},
      },
    ],
    viewport: { x: 100, y: 100, zoom: 0.6 },
  },
  layoutDirection: 'RIGHT',
};

export const meetingNotesFlow: TemplateModel = {
  id: 304,
  name: 'Meeting Notes to Action Items',
  value: diagram,
  icon: 'CalendarCheck',
};
