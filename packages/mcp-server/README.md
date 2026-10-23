# @workflowbuilder/mcp

An [MCP](https://modelcontextprotocol.io) server that gives your AI coding assistant the [Workflow Builder](https://www.workflowbuilder.io) docs and the public API of `@workflowbuilder/sdk`, `@workflowbuilder/ui` and `@workflowbuilder/temporal`. The assistant searches the docs and looks up real signatures before it writes code, instead of guessing.

Docs and API data are bundled in the package: no account, no API key, and the server makes no network calls. Requires Node.js 20 or newer.

## Quick start

Claude Code:

```bash
claude mcp add --scope project workflowbuilder-docs -- npx -y @workflowbuilder/mcp
```

Claude Desktop (`claude_desktop_config.json`) and other clients that use the `mcpServers` format:

```json
{
  "mcpServers": {
    "workflowbuilder-docs": {
      "command": "npx",
      "args": ["-y", "@workflowbuilder/mcp"]
    }
  }
}
```

Cursor (`.cursor/mcp.json`) takes the same entry with `"type": "stdio"` added. VS Code (`.vscode/mcp.json`) names the key `servers` and needs `"type": "stdio"` in the entry. OpenAI Codex: `codex mcp add workflowbuilder-docs -- npx -y @workflowbuilder/mcp`. On Windows, if your client cannot start `npx`, use `cmd` as the command and `/c npx -y @workflowbuilder/mcp` as the arguments.

Restart the assistant, then ask something like _"Search the Workflow Builder docs for how to persist workflows with a REST API"_. Setup for each client: [Use with AI assistants](https://www.workflowbuilder.io/docs/get-started/ai-assistants/).

## Tools

| Tool             | Use                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `search_docs`    | Keyword search over documentation sections. Results carry an id, section title, URL and markdown.   |
| `get_doc`        | Read a page or one section by id, or by an internal doc link such as `/get-started/theming/`.       |
| `search_symbols` | Search exports and their members. Filters: `package` (`sdk`, `ui`, `temporal`) and `kind`.          |
| `get_symbol`     | Signature, JSDoc, members and a ready import statement for `sdk:Name`, `sdk:Name.member` or a name. |

A `search_docs` hit is one section, not the page. For the pages of the top three hits the response adds `otherSections`, e.g. `{"readme/temporal":["worker","client","+2 more"]}`: the anchors of that page's sections no hit covers (at most 8 per page). `get_doc` with a section id (`page#anchor`) adds `sections`, the page's other sections as `{id, title}`; `get_doc` with the page id returns the whole page. Both also apply to `readme/<package>` pages.

Responses are compact JSON in a single text item. Errors use `isError: true` with `{"error": "..."}`.

## Versions

Each version holds the docs and the API as they were on the commit it was published from. The server logs one line to stderr when it is ready, with the versions it documents: `wb-docs 0.1.0 ready: ... documents sdk 3.0.0, ui 1.0.0, temporal 0.2.0 ...`.

## Developing in this repo

```sh
pnpm --filter @workflowbuilder/mcp build           # tsc, docs snapshot, TypeDoc for the three packages, about 30 s
pnpm --filter @workflowbuilder/mcp test            # unit tests, fixtures only, no build needed
pnpm --filter @workflowbuilder/mcp smoke           # real corpus, needs a build
pnpm --filter @workflowbuilder/mcp smoke:package   # packs the tarball, installs it outside the repo, talks to it over stdio
pnpm --filter @workflowbuilder/mcp docs-data       # refresh only the docs snapshot, about 2 s
```

The repo-root `.mcp.json` registers the server as `wb-docs` (`node packages/mcp-server/dist/index.js`). Claude Code loads MCP servers at session start, so build first and restart the session after rebuilding.

The build reads the repo and writes everything the server needs to `dist/data`; the server never reads the repo:

- `docs.json`: the docs pages (`apps/docs/src/content/docs`) and the package READMEs, cleaned and chunked, with GitHub links pinned to the commit it was built from. Cleaning and chunking happen here, so after editing docs or `src/config/chunking.ts`, `src/config/mdx-components.ts` or the loaders in `src/docs/` (`chunk.ts`, `clean-mdx.ts`, `load-*.ts`), run `docs-data` and restart the session.
- `typedoc/*.json` and `manifest.json`: the public API, the declaration counts and the documented package versions.

The search index is built from that data at startup, in 100-200 ms, so ranking and synonym changes apply on the next start. `docs.json` carries a format number: when the shape of pages, sections or chunks changes, bump `DOCS_FORMAT` in `src/corpus/build-corpus.ts`, and a server that meets an older snapshot refuses it instead of serving broken results. `prepack` (`scripts/check-packed-build.ts`) refuses to pack or publish a `dist/` that is missing, incomplete or built from another commit.

### Layout

| Path                | Contents                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/`       | The tunable surface: ranking, synonyms, response budgets (read at startup), chunking and MDX rules (read by `docs-data`).                       |
| `src/docs/`         | Page and README loading, MDX cleaning, chunking, ids and the docs search engine.                                                                |
| `src/symbols/`      | TypeDoc extraction, the type printer and the symbol search engine.                                                                              |
| `src/corpus/`       | `loadDocs()` reads the repo at build time; `buildCorpus()` indexes `dist/data` and is shared by the server and the smoke test.                  |
| `src/tools/`        | One folder per tool: `tool.config.ts` (schema and description), validator, handler.                                                             |
| `src/__fixtures__/` | Small checked-in docs and TypeDoc JSON used by the tests. `pnpm --filter @workflowbuilder/mcp fixtures:update` regenerates the JSON.            |
| `scripts/`          | `generate-docs-data.ts` and `generate-typedoc.ts` (build steps), `smoke.ts`, `smoke-package.ts`, `check-packed-build.ts`, `update-fixtures.ts`. |

Only the modules `src/index.ts` imports are compiled to `dist`. The MDX parsers (`remark-*`, `unified`, `yaml`, `github-slugger`) are devDependencies, so the server must not import anything from `src/corpus/load-docs.ts` or the loaders behind it; `smoke:package` fails if it does.

### Notes

- Ids: pages are `guides/configuring-the-editor`, sections `guides/configuring-the-editor#props-reference`, symbols `sdk:WorkflowBuilderRootProps` and members `sdk:WorkflowBuilderRootProps.nodeTypes`.
- Package READMEs are docs pages too: `readme/sdk`, `readme/ui`, `readme/temporal`, and any other `.md` a package lists in `package.json` `files` as `readme/<pkg>/<name>` (today `readme/ui/css-layers`; CHANGELOGs are left out). Sections use the same anchors as site pages, urls point at the file on GitHub and relative links are made absolute. They sit in a separate search index, and `readmeWeights` in `src/config/ranking.ts` scales their hits: the sdk and ui READMEs restate site pages, so they rank far below them, while the temporal README is the only place that documents installing the plugin and wiring a worker.
- Components in `.mdx` are reduced to text by the rules in `src/config/mdx-components.ts`. Demo node schemas are not inlined; the page gets a GitHub link to the demo folder instead. Links relative to a page (`./trigger/`) become site paths (`/nodes/trigger/`) that `get_doc` accepts.
- Temporal exports have no JSDoc, so they rank on name and signature.
- A docs page that cannot be loaded (bad frontmatter, unclosed JSX, unknown `PropsTable` slug, missing partial, two files with one id) fails `docs-data` and so the build, with one `docs-data: skipped <file>: <reason>` line per page: the package would otherwise ship without it. TypeDoc files that are empty or disagree with `manifest.json` make the server warn on stderr and keep serving.
- `build` runs TypeDoc twice per package: once for the entry points, and once over the files that declare types the package references without exporting (`dist/data/typedoc/<package>.referenced.json`). `get_symbol` expands aliases of those types and serves them by name with `exported: false`; they are not searchable.
- `<CssVariablesTable>` is rendered as one line of `--wb-public-*` names read from `packages/ui/src/components/<dir>/**/*.css`. That line, link targets added after link text, the OverflowCard note, and list items that open with a link to another docs page (`- [Next steps](/...)`, also `*`, `+`, `1.`, `1)`) are returned in content but left out of the search index.
- `docs-data` and `typedoc` rebuild their part of `dist/data` without touching `dist/*.js`.
