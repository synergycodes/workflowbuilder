import { budget } from '../../config/budget.js';
import type { ToolDefinition } from '../types.js';

export const SEARCH_SYMBOLS_TOOL: ToolDefinition = {
  name: 'search_symbols',
  description: [
    'Search the public TypeScript API of @workflowbuilder/sdk, @workflowbuilder/ui and @workflowbuilder/temporal: components, hooks, functions, types, constants, classes and their props and members. Call it whenever you are about to write code against a Workflow Builder export; it returns the exact current signature and import path instead of a guess. Query by full or partial name, e.g. "WorkflowBuilderRootProps", "useStore", "nodeTypes", "TemporalWorkflowEngine".',
    `Returns up to "limit" hits (default ${budget.searchSymbols.defaultLimit}, max ${budget.searchSymbols.maxLimit}). Each hit has an id, kind, package, importPath, a shortened signature and a one-line summary. Ids are "package:Name" for an export (sdk:WorkflowBuilderRootProps) and "package:Name.member" for a prop or member (sdk:WorkflowBuilderRootProps.nodeTypes); pass one to get_symbol for the full entry.`,
    'Kinds: class, function, interface, type (type alias), enum, const (variables and constants; hooks such as useStore and components declared as consts are "const", not "function"), and property or method for members.',
    `The response is capped at about ${budget.searchSymbols.maxResponseTokens} tokens; hits dropped for size are reported with "truncated": true, "total" and a hint. A query with no searchable terms returns an empty list with a hint.`,
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        maxLength: 1000,
        description: 'Full or partial symbol name, or keywords.',
      },
      package: { type: 'string', enum: ['sdk', 'ui', 'temporal'], description: 'Limit results to one package.' },
      kind: {
        type: 'string',
        enum: ['class', 'function', 'interface', 'type', 'const', 'enum', 'property', 'method'],
        description: 'Filter by symbol kind.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: budget.searchSymbols.maxLimit,
        default: budget.searchSymbols.defaultLimit,
        description: 'Maximum number of hits to return.',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};
