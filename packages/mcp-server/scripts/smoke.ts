import { buildCorpus } from '../src/corpus/build-corpus.js';
import { callTool, createToolRegistry } from '../src/server.js';

const EXPECTED_PAGES = 80;
const MAX_CORPUS_BUILD_MS = 1000;
const DOCUMENTED_PACKAGES = ['sdk', 'ui', 'temporal'];

const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

async function call(registry: ReturnType<typeof createToolRegistry>, name: string, arguments_: object) {
  const result = await callTool(registry, name, arguments_);
  if ('isError' in result) throw new Error(`${name} failed: ${result.content[0].text}`);
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

const warnings: string[] = [];
const corpus = await buildCorpus({
  onWarning: (message) => {
    warnings.push(message);
    console.error(`wb-docs: ${message}`);
  },
});
const registry = createToolRegistry(corpus);
const { stats } = corpus;
console.error(
  `smoke: ${stats.pages} pages, ${stats.chunks} chunks, ${stats.symbols} symbols, ${stats.members} members, corpus built in ${stats.buildMs} ms`,
);

check(stats.pages === EXPECTED_PAGES, `expected ${EXPECTED_PAGES} pages, found ${stats.pages}`);
check(warnings.length === 0, `${warnings.length} corpus warning(s), the TypeDoc data is inconsistent`);
check(stats.buildMs < MAX_CORPUS_BUILD_MS, `corpus build took ${stats.buildMs} ms, limit ${MAX_CORPUS_BUILD_MS} ms`);
check(
  DOCUMENTED_PACKAGES.every((name) => /^\d+\.\d+\.\d+/.test(stats.versions[name] ?? '')),
  `the manifest lacks a documented version: ${JSON.stringify(stats.versions)}`,
);

const symbolSearch = (await call(registry, 'search_symbols', { query: 'WorkflowBuilderRootProps' })) as {
  results: { id: string }[];
};
check(
  symbolSearch.results[0]?.id === 'sdk:WorkflowBuilderRootProps',
  'search_symbols: WorkflowBuilderRootProps is not rank 1',
);

const symbol = (await call(registry, 'get_symbol', { name: 'sdk:WorkflowBuilderRootProps' })) as {
  members: { name: string }[];
};
check(
  symbol.members.some((member) => member.name === 'nodeTypes'),
  'get_symbol: WorkflowBuilderRootProps has no member nodeTypes',
);

const docsSearch = (await call(registry, 'search_docs', { query: 'configuring the editor props' })) as {
  results: { id: string }[];
};
check(
  docsSearch.results.slice(0, 5).some((result) => result.id.startsWith('guides/configuring-the-editor')),
  'search_docs: guides/configuring-the-editor is not in the top 5',
);

const page = (await call(registry, 'get_doc', { id: '/get-started/theming/' })) as { id: string };
check(page.id === 'get-started/theming', 'get_doc: /get-started/theming/ did not resolve');

const readme = (await call(registry, 'get_doc', {
  id: 'https://github.com/synergycodes/workflowbuilder/blob/main/packages/temporal/README.md#worker',
})) as { id: string };
check(readme.id === 'readme/temporal#worker', 'get_doc: the temporal README url did not resolve');

const workerSearch = (await call(registry, 'search_docs', {
  query: 'WorkflowBuilderPlugin Worker executors store',
})) as {
  results: { id: string }[];
};
check(
  workerSearch.results.some((result) => result.id.startsWith('readme/temporal')),
  'search_docs: the temporal README is not in the results for the worker setup',
);

for (const failure of failures) console.error(`smoke: FAIL ${failure}`);
if (failures.length > 0) process.exitCode = 1;
else console.error('smoke: ok');
