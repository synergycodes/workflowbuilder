---
title: Use with AI assistants
description: Give Claude Code, Cursor, VS Code, Codex and other AI coding assistants the Workflow Builder docs and API through an MCP server.
---

AI coding assistants do not know the Workflow Builder API from their training data, so they guess, and the guesses look plausible but do not compile. `@workflowbuilder/mcp` is an [MCP](https://modelcontextprotocol.io) server that lets your assistant search these docs and look up the exact public API of `@workflowbuilder/sdk`, `@workflowbuilder/ui` and `@workflowbuilder/temporal` before it writes code.

The docs and the API reference are bundled in the package. No account, no API key, and the server makes no network calls.

## Add it to your assistant

You need Node.js 20 or newer. Every client below starts the server with `npx -y @workflowbuilder/mcp`. Restart or reload the assistant after you change its configuration.

### Claude Code

```bash
claude mcp add --scope project workflowbuilder-docs -- npx -y @workflowbuilder/mcp
```

`--scope project` writes the server to `.mcp.json` in your repository, so everyone who works on it gets the server. Without the flag, the server is added only for you, in this project. Use `--scope user` to have it in every project.

### Cursor

Add to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for every project:

```json
{
  "mcpServers": {
    "workflowbuilder-docs": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@workflowbuilder/mcp"]
    }
  }
}
```

### VS Code with GitHub Copilot

Add to `.vscode/mcp.json` in your project. VS Code names the top-level key `servers`:

```json
{
  "servers": {
    "workflowbuilder-docs": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@workflowbuilder/mcp"]
    }
  }
}
```

### OpenAI Codex

```bash
codex mcp add workflowbuilder-docs -- npx -y @workflowbuilder/mcp
```

Or add it to `~/.codex/config.toml`:

```toml
[mcp_servers.workflowbuilder-docs]
command = "npx"
args = ["-y", "@workflowbuilder/mcp"]
```

### Claude Desktop

Add to `claude_desktop_config.json` (`~/Library/Application Support/Claude/` on macOS, `%APPDATA%\Claude\` on Windows), then quit and reopen the app:

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

### Other clients

Any client that runs local (stdio) MCP servers works: set the command to `npx` and the arguments to `-y @workflowbuilder/mcp`.

On Windows, if your client cannot start `npx`, use `cmd` as the command and `/c npx -y @workflowbuilder/mcp` as the arguments.

## Check that it works

Ask your assistant something like _"Search the Workflow Builder docs for how to persist workflows with a REST API"_. It should call `search_docs` and answer from the [REST API persistence](/get-started/persistence/rest-api/) page.

## What your assistant can do with it

| Tool             | What it does                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `search_docs`    | Searches these docs and the package READMEs, and returns the matching sections.                                      |
| `get_doc`        | Reads a whole page or one section, also from a docs link such as `/get-started/theming/`.                            |
| `search_symbols` | Searches the exports of the SDK, the UI library and the Temporal plugin.                                             |
| `get_symbol`     | Returns a symbol's signature, description, members and the import statement to use, e.g. `WorkflowBuilderRootProps`. |

## Versions

Each version of `@workflowbuilder/mcp` holds the docs and the API as they were when it was published. When the server starts, its log lists the SDK, UI and Temporal plugin versions it documents. If your project uses an older SDK, check what the assistant suggests against your installed version.
