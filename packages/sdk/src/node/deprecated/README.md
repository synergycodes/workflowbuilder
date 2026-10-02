# Migrating `outputSchema` → `schemaOutput`

`PaletteItem.outputSchema` (`DeprecatedNodeOutputSchema`) is deprecated and will be removed in **3.0**. Replace it with `PaletteItem.schemaOutput` (`NodeSchemaOutput`).

Why: the new format is a JSON Schema (same dialect as `NodeSchema`), supports nested objects, and scopes variables **per source handle** — the `error` port no longer advertises `success` variables.

Both fields may coexist during migration; `schemaOutput` wins when present, `outputSchema` is only read when `schemaOutput` is missing.

## Strategy

1. Add `schemaOutput` next to the existing `outputSchema` (see mapping below).
2. Verify the variable picker on a downstream node shows the same variables.
3. Delete `outputSchema`.
4. Repeat per node. Ship in any order — no big-bang needed.

## Mapping

| Old (`outputSchema`)                                       | New (`schemaOutput`)                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `properties: { key: { type, label, description } }`        | `bySourceHandle.<handle>: { type: 'object', properties: { key: { type, title, description } } }` |
| flat, dot-notation keys (`'result.status'`)                | nested `properties` (`result: { type: 'object', properties: { status } }`)                       |
| `label`                                                    | `title`                                                                                          |
| `type: 'datetime'`                                         | `type: 'string', format: 'date-time'`                                                            |
| `type: 'date'`                                             | `type: 'string'` (no dedicated mapping yet)                                                      |
| same variables on every handle                             | `bySourceHandle.every`                                                                           |
| `variants: { name: { variantRule, properties } }` (record) | `variants: [{ variantRule, bySourceHandle }]` (array)                                            |
| `variantRule: { dataPropertyName, dataPropertyValue }`     | `variantRule: { onlyIfPropertyNameEquals: { path, value } }` (`path` supports dot notation)      |
| first matching variant only                                | **all** matching variants are merged                                                             |
| —                                                          | `variantRule: { fromValueOfPropertyPath, toSourceHandles }` for user-defined output shapes       |

## Example: default

```ts
// before
outputSchema: {
  type: 'default',
  properties: {
    status: { type: 'string', label: 'Status' },
    errorMessage: { type: 'string', label: 'Error Message' },
  },
}

// after — success/error split
schemaOutput: {
  type: 'default',
  bySourceHandle: {
    success: {
      type: 'object',
      properties: { status: { type: 'string', title: 'Status' } },
    },
    error: {
      type: 'object',
      properties: { errorMessage: { type: 'string', title: 'Error Message' } },
    },
  },
}
```

Use `bySourceHandle.every` instead of named handles when the node has a single output or all handles share the shape.

## Example: variant

```ts
// before
outputSchema: {
  type: 'variant',
  variants: {
    text: {
      variantRule: { dataPropertyName: 'mode', dataPropertyValue: 'text' },
      properties: { text: { type: 'string', label: 'Text' } },
    },
    json: {
      variantRule: { dataPropertyName: 'mode', dataPropertyValue: 'json' },
      properties: { data: { type: 'object', label: 'Data' } },
    },
  },
}

// after
schemaOutput: {
  type: 'variant',
  variants: [
    {
      variantRule: { onlyIfPropertyNameEquals: { path: 'mode', value: 'text' } },
      bySourceHandle: {
        every: { type: 'object', properties: { text: { type: 'string', title: 'Text' } } },
      },
    },
    {
      variantRule: { onlyIfPropertyNameEquals: { path: 'mode', value: 'json' } },
      bySourceHandle: {
        every: { type: 'object', properties: { data: { type: 'object', title: 'Data' } } },
      },
    },
  ],
}
```

A variant with `variantRule: undefined` always matches — use it for variables shared across all modes (old format allowed only one variant to apply; new merges them).

## Gotchas

- Variable references are unchanged (`{{nodeId.result.status}}`), so existing diagrams keep working.
- If a node previously exposed error fields on every handle, moving them to `bySourceHandle.error` is a behaviour change for downstream nodes on the success path — intended, but check templates.
- Reference: `apps/demo/src/app/data/nodes/*/schema-output.ts`; `action/action.ts` still carries the old format as a side-by-side example.
