# @workflow-builder/mcp-server

`wb-docs`: a stdio MCP server that serves the hand-written Workflow Builder docs (`apps/docs/src/content/docs`), the READMEs of the published packages and the public TypeScript API of `@workflowbuilder/sdk`, `@workflowbuilder/ui` and `@workflowbuilder/temporal`. Private, not published.

## Tools

| Tool             | Use                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `search_docs`    | Keyword search over documentation sections. Results carry an id, section title, URL and markdown.   |
| `get_doc`        | Read a page or one section by id, or by an internal doc link such as `/get-started/theming/`.       |
| `search_symbols` | Search exports and their members. Filters: `package` (`sdk`, `ui`, `temporal`) and `kind`.          |
| `get_symbol`     | Signature, JSDoc, members and a ready import statement for `sdk:Name`, `sdk:Name.member` or a name. |

A `search_docs` hit is one section, not the page. For the pages of the top three hits the response adds `otherSections`, e.g. `{"readme/temporal":["worker","client","+2 more"]}`: the anchors of that page's sections no hit covers (at most 8 per page). `get_doc` with a section id (`page#anchor`) adds `sections`, the page's other sections as `{id, title}`; `get_doc` with the page id returns the whole page. Both also apply to `readme/<package>` pages.

Responses are compact JSON in a single text item. Errors use `isError: true` with `{"error": "..."}`.

## Build and run

```sh
pnpm --filter mcp-server build   # tsc + TypeDoc for the three packages, about 30 s
pnpm --filter mcp-server test    # unit tests, fixtures only, no build needed
pnpm --filter mcp-server smoke   # real corpus, needs a build
```

The repo-root `.mcp.json` registers the server as `wb-docs` (`node packages/mcp-server/dist/index.js`). Claude Code loads MCP servers at session start, so build first and restart the session after rebuilding.

Docs are read from `apps/docs/src/content/docs` and indexed in memory every time the server starts, so they are always current. Symbols come from `dist/data/typedoc/*.json`, so they are as fresh as the last `build` (or `pnpm --filter mcp-server typedoc`). The server logs one line to stderr when it is ready.

## Layout

| Path                | Contents                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/config/`       | The tunable surface: ranking, synonyms, chunking, response budgets. Plain data, no logic.                                  |
| `src/docs/`         | Page and README loading, MDX cleaning, chunking, ids and the docs search engine.                                           |
| `src/symbols/`      | TypeDoc extraction, the type printer and the symbol search engine.                                                         |
| `src/corpus/`       | `buildCorpus()`: the one entry point shared by the server and the smoke test.                                              |
| `src/tools/`        | One folder per tool: `tool.config.ts` (schema and description), validator, handler.                                        |
| `src/__fixtures__/` | Small checked-in docs and TypeDoc JSON used by the tests. `pnpm --filter mcp-server fixtures:update` regenerates the JSON. |
| `scripts/`          | `generate-typedoc.ts` (build step), `smoke.ts`, `update-fixtures.ts`.                                                      |

## Notes

- Ids: pages are `guides/configuring-the-editor`, sections `guides/configuring-the-editor#props-reference`, symbols `sdk:WorkflowBuilderRootProps` and members `sdk:WorkflowBuilderRootProps.nodeTypes`.
- Package READMEs are docs pages too: `readme/sdk`, `readme/ui`, `readme/temporal`, and any other `.md` a package lists in `package.json` `files` as `readme/<pkg>/<name>` (today `readme/ui/css-layers`; CHANGELOGs are left out). Sections use the same anchors as site pages, urls point at the file on GitHub and relative links are made absolute. They sit in a separate search index, and `readmeWeights` in `src/config/ranking.ts` scales their hits: the sdk and ui READMEs restate site pages, so they rank far below them, while the temporal README is the only place that documents installing the plugin and wiring a worker.
- Components in `.mdx` are reduced to text by the rules in `src/config/mdx-components.ts`. Demo node schemas are not inlined; the page gets a pointer to the demo folder instead.
- Temporal exports have no JSDoc, so they rank on name and signature.
- A docs page that cannot be loaded (bad frontmatter, unclosed JSX, unknown `PropsTable` slug, missing partial, two files with one id) is skipped with one `wb-docs: skipped <file>: <reason>` line on stderr; the server keeps serving everything else. TypeDoc files that are empty or disagree with `manifest.json` also warn.
- `build` runs TypeDoc twice per package: once for the entry points, and once over the files that declare types the package references without exporting (`dist/data/typedoc/<package>.referenced.json`). `get_symbol` expands aliases of those types and serves them by name with `exported: false`; they are not searchable.
- `<CssVariablesTable>` is rendered as one line of `--wb-public-*` names read from `packages/ui/src/components/<dir>/**/*.css`. That line, link targets added after link text, the OverflowCard note, and list items that open with a link to another docs page (`- [Next steps](/...)`, also `*`, `+`, `1.`, `1)`) are returned in content but left out of the search index.
- Generated `dist/data` is rebuilt by `pnpm --filter mcp-server typedoc` without touching `dist/*.js`.
