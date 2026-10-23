import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PACKAGE_ROOT } from '../src/paths.js';

const EXPECTED_TOOLS = ['get_doc', 'get_symbol', 'search_docs', 'search_symbols'];

// pnpm and npm are .cmd shims on Windows, which only start through a shell; quote what the shell would split.
function run(command: string, commandArguments: string[], cwd: string) {
  const shell = process.platform === 'win32';
  const quoted = shell ? commandArguments.map((value) => (/\s/.test(value) ? `"${value}"` : value)) : commandArguments;
  execFileSync(command, quoted, { cwd, stdio: ['ignore', 'ignore', 'inherit'], shell });
}

const failures: string[] = [];
const directory = mkdtempSync(path.join(tmpdir(), 'wb-mcp-package-'));

try {
  run('pnpm', ['pack', '--pack-destination', directory], PACKAGE_ROOT);
  const tarball = readdirSync(directory).find((name) => name.endsWith('.tgz'));
  if (!tarball) throw new Error('pnpm pack produced no tarball');
  writeFileSync(path.join(directory, 'package.json'), '{ "private": true }\n');
  run('npm', ['install', `./${tarball}`, '--omit=dev', '--no-audit', '--no-fund'], directory);

  // `--no` refuses a registry download, so this starts the tarball just installed, through its bin entry.
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['--no', '@workflowbuilder/mcp'],
    cwd: directory,
    stderr: 'inherit',
  });
  const client = new Client({ name: 'smoke-package', version: '0.0.0' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();
    if (names.join(',') !== EXPECTED_TOOLS.join(',')) failures.push(`tools: expected ${EXPECTED_TOOLS}, got ${names}`);

    const call = async (name: string, arguments_: Record<string, unknown>) => {
      const result = await client.callTool({ name, arguments: arguments_ });
      const text = (result.content as { text: string }[])[0]?.text ?? '';
      if (result.isError) throw new Error(`${name} failed: ${text}`);
      return JSON.parse(text) as Record<string, unknown>;
    };

    const search = (await call('search_docs', { query: 'add a custom node' })) as { results: unknown[] };
    if (search.results.length === 0) failures.push('search_docs: no results for "add a custom node"');

    const symbol = (await call('get_symbol', { name: 'sdk:WorkflowBuilderRootProps' })) as {
      members: { name: string }[];
    };
    if (!symbol.members.some((member) => member.name === 'nodeTypes')) {
      failures.push('get_symbol: WorkflowBuilderRootProps has no member nodeTypes');
    }
  } finally {
    await client.close();
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  rmSync(directory, { recursive: true, force: true });
}

for (const failure of failures) console.error(`smoke:package: FAIL ${failure}`);
if (failures.length > 0) process.exitCode = 1;
else console.error('smoke:package: ok');
