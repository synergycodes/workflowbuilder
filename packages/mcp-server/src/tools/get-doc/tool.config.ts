import { budget } from '../../config/budget.js';
import type { ToolDefinition } from '../types.js';

export const GET_DOC_TOOL: ToolDefinition = {
  name: 'get_doc',
  description: [
    'Read a documentation page, or one section of it, by id or URL. Package READMEs have ids like "readme/temporal".',
    'Accepts a page id ("guides/configuring-the-editor"), a section id ("guides/configuring-the-editor#props-reference"; the anchor of an H3 heading resolves to the H2 section that holds it, and a "~2" chunk suffix returns the whole section), the "url" of a search_docs hit, or an internal doc link such as "/get-started/theming/" or "/guides/configuring-the-editor/#props".',
    `The response stays under about ${budget.getDoc.maxResponseTokens} tokens. A page over that size returns its intro, "truncated": true and "sections" (id and title of every section); fetch the section you need. A single oversized section is cut where the limit falls.`,
    'Links into the API reference ("/api/...") are not documents: the error names the get_symbol id to use instead.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        description: 'Page id, section id, search_docs url or internal doc link.',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
};
