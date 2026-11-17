import { budget } from '../../config/budget.js';
import type { ToolDefinition } from '../types.js';

export const SEARCH_DOCS_TOOL: ToolDefinition = {
  name: 'search_docs',
  description: [
    'Search the Workflow Builder documentation: getting started, guides, node schemas, built-in nodes, plugins, the UI library and the package READMEs (npm install, Temporal worker and executor setup). Use it before answering how to embed, configure or extend Workflow Builder; it returns version-matched sections of the official docs, which are more reliable than training data.',
    `Returns up to "limit" hits (default ${budget.searchDocs.defaultLimit}, max ${budget.searchDocs.maxLimit}), best first. Each hit has an id, page title, section title, url and "content": an excerpt of at most ${budget.searchDocs.maxExcerptChars} characters of the section's markdown, flagged "truncated": true when cut. When the query terms sit deeper in a long section the excerpt starts there, after a leading "…".`,
    'A hit is one section, not the whole page: "otherSections" maps the page of each top hit to the anchors of its sections not among the hits, and get_doc with the page id (the part before "#") returns the whole page.',
    'Ids: "guides/configuring-the-editor" is a page, "guides/configuring-the-editor#props-reference" one section of it, and a "~2" style suffix marks a later chunk of a long section. Pass an id or the url to get_doc to read the page or the whole section.',
    `The response is capped at about ${budget.searchDocs.maxResponseTokens} tokens; hits dropped for size are reported with "truncated": true, "total" and a hint. A query with no searchable terms (only stopwords, or not English) returns an empty list with a hint.`,
    'Keyword queries in English work best, e.g. "nodeTypes palette", "custom node template", "save diagram REST API".',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1, maxLength: 1000, description: 'Keywords or a short question.' },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: budget.searchDocs.maxLimit,
        default: budget.searchDocs.defaultLimit,
        description: 'Maximum number of hits to return.',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};
