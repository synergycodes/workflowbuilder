import type { ToolDefinition } from '../types.js';

export const GET_SYMBOL_TOOL: ToolDefinition = {
  name: 'get_symbol',
  description: [
    'Get the API entry for one Workflow Builder export: shortened signature, documentation comment, members with their types, source file and a ready-to-paste import statement.',
    'Pass an id from search_symbols ("sdk:WorkflowBuilderRootProps", "sdk:WorkflowBuilderRootProps.nodeTypes") or a name. The package prefix and names are case-insensitive; a bare name works when only one package exports it, otherwise the error lists the candidate ids. The docs notation "WorkflowBuilder.Root" resolves to sdk:WorkflowBuilderRoot.',
    'Union types: "members" holds only the members every variant declares with the same type; "variants" lists the remaining members of each variant (named when the variant is a named type). Exactly one variant applies.',
    'Aliases and extended types are expanded into their members. A type the package declares but does not export (for example NodeDefinition) is returned with "exported": false and no import statement; it is reachable only through the type that names it.',
    'Signatures are shortened and nested object types may show as { … }; use a member id for the full member text.',
    'Cut output is flagged: "truncated": true, with "unionSize" when a long union signature was cut, and "memberCount" with "membersTruncated" when members were omitted. A member with "truncated": true has a shortened signature or summary; fetch it by id for the full text.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Symbol id from search_symbols, or a bare export name.',
      },
    },
    required: ['name'],
    additionalProperties: false,
  },
};
