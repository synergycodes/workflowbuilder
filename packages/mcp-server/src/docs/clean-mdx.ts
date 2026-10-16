import path from 'node:path';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { type MdxRule, mdxComponents as defaultComponents } from '../config/mdx-components.js';
import { CSS_VARIABLES_LABEL, CSS_VARIABLE_PREFIX } from './generated-content.js';

interface Position {
  start: { offset?: number };
  end: { offset?: number };
}

interface Attribute {
  type: string;
  name?: string;
  value?: string | { value?: string } | null;
}

interface AstNode {
  type: string;
  position?: Position;
  children?: AstNode[];
  name?: string | null;
  attributes?: Attribute[];
  value?: string;
  alt?: string | null;
}

interface CleanContext {
  filePath: string;
  readPartial: (absolutePath: string) => string;
  propsTypes: (slug: string) => readonly string[] | null | undefined;
  // CSS variable names of a documented component; undefined when the component is unknown.
  cssVariables?: (slug: string) => readonly string[] | undefined;
  components?: Record<string, MdxRule>;
  depth?: number;
}

interface CleanResult {
  text: string;
  propsTableSlugs: string[];
}

type SpecialHandler = Extract<MdxRule, { action: 'special' }>['handler'];

interface Edit {
  start: number;
  end: number;
  replacement: string;
}

const MAX_PARTIAL_DEPTH = 5;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const FENCE = /^\s*(```|~~~)/;
const NODE_SOURCE_DIRECTORY = 'apps/demo/src/app/data/nodes';
const JSX_COMMENT = /^\s*\/\*[\s\S]*\*\/\s*$/;
const JSON_IMPORT = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+\.json)['"]/g;

export function splitFrontmatter(source: string) {
  const match = FRONTMATTER.exec(source);
  return match ? { raw: match[1], body: source.slice(match[0].length) } : { raw: undefined, body: source };
}

function offsets(node: AstNode) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) throw new Error(`Node ${node.type} has no source position`);
  return { start, end };
}

function attribute(node: AstNode, name: string) {
  const found = node.attributes?.find((item) => item.type === 'mdxJsxAttribute' && item.name === name);
  if (!found || found.value === null || found.value === undefined) return;
  if (typeof found.value === 'string') return found.value;
  return found.value.value?.replace(/^(['"`])(.*)\1$/s, '$2');
}

function applyTemplate(template: string, node: AstNode) {
  let missing = false;
  const text = template.replaceAll(/\{attr:([\w-]+)\}/g, (_match, name: string) => {
    const value = attribute(node, name);
    if (value === undefined || value === '') missing = true;
    return value ?? '';
  });
  return missing ? undefined : text;
}

function collapseBlankLines(text: string) {
  const output: string[] = [];
  let inFence = false;
  let blankRun = 0;
  for (const line of text.split('\n')) {
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === '') {
      blankRun += 1;
      if (blankRun > 2) continue;
    } else {
      blankRun = 0;
    }
    output.push(line);
  }
  return output.join('\n');
}

function importedPartials(tree: AstNode, filePath: string) {
  const partials = new Map<string, string>();
  for (const node of tree.children ?? []) {
    if (node.type !== 'mdxjsEsm' || !node.value) continue;
    for (const match of node.value.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+\.mdx)['"]/g)) {
      partials.set(match[1], path.resolve(path.dirname(filePath), match[2]));
    }
  }
  return partials;
}

// Values reachable as `name.path.to.value` from a JSON file the page imports.
function importedJson(tree: AstNode, context: CleanContext) {
  const values = new Map<string, unknown>();
  for (const node of tree.children ?? []) {
    if (node.type !== 'mdxjsEsm' || !node.value) continue;
    for (const match of node.value.matchAll(JSON_IMPORT)) {
      try {
        values.set(match[1], JSON.parse(context.readPartial(path.resolve(path.dirname(context.filePath), match[2]))));
      } catch {
        // An unreadable import leaves its expressions as written.
      }
    }
  }
  return values;
}

function lookupPath(values: ReadonlyMap<string, unknown>, expression: string) {
  const [root, ...keys] = expression.trim().split('.');
  let current: unknown = values.get(root);
  for (const key of keys) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) return;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' || typeof current === 'number' ? String(current) : undefined;
}

// The shared prefix is stated once: the longest list (Button) would otherwise outgrow a search chunk.
function cssVariablesLine(names: readonly string[]) {
  if (names.length === 0) return `${CSS_VARIABLES_LABEL}: none, the component has no variables of its own.`;
  if (!names.every((name) => name.startsWith(CSS_VARIABLE_PREFIX)))
    return `${CSS_VARIABLES_LABEL}: ${names.join(', ')}`;
  const short = names.map((name) => name.slice(CSS_VARIABLE_PREFIX.length));
  return `${CSS_VARIABLES_LABEL} (each name starts with ${CSS_VARIABLE_PREFIX}): ${short.join(', ')}`;
}

function isMdxJsx(node: AstNode) {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

function collectEdits(source: string, tree: AstNode, context: CleanContext, slugs: string[]) {
  const components = context.components ?? defaultComponents;
  const partials = importedPartials(tree, context.filePath);
  const jsonValues = importedJson(tree, context);
  const edits: Edit[] = [];

  // A flow element on its own line takes the line's indentation with it.
  const startOf = (node: AstNode) => {
    const { start } = offsets(node);
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxjsEsm' && node.type !== 'mdxFlowExpression')
      return start;
    let cursor = start;
    while (cursor > 0 && (source[cursor - 1] === ' ' || source[cursor - 1] === '\t')) cursor -= 1;
    return cursor === 0 || source[cursor - 1] === '\n' ? cursor : start;
  };

  const replaceNode = (node: AstNode, replacement: string) => {
    edits.push({ start: startOf(node), end: offsets(node).end, replacement });
  };

  const visitChildren = (node: AstNode) => {
    for (const child of node.children ?? []) visit(child);
  };

  const unwrap = (node: AstNode, opening: string, closingText = '') => {
    const children = node.children ?? [];
    const { end } = offsets(node);
    const start = startOf(node);
    if (children.length === 0) {
      edits.push({ start, end, replacement: opening + closingText });
      return;
    }
    const firstStart = startOf(children[0]);
    const lastEnd = offsets(children.at(-1) as AstNode).end;
    const closing = (node.type === 'mdxJsxFlowElement' ? '\n' : '') + closingText;
    edits.push({ start, end: firstStart, replacement: opening }, { start: lastEnd, end, replacement: closing });
    visitChildren(node);
  };

  const applySpecial = (node: AstNode, handler: SpecialHandler) => {
    if (handler === 'link') {
      const href = attribute(node, 'href');
      unwrap(node, '', href && /^(https?:\/\/|\/)/.test(href) ? ` (${href})` : '');
      return;
    }
    if (handler === 'cssVariablesTable') {
      const names = context.cssVariables?.(attribute(node, 'slug') ?? '');
      replaceNode(node, names ? cssVariablesLine(names) : '');
      return;
    }
    if (handler === 'tabItem') {
      const label = attribute(node, 'label');
      unwrap(node, label ? `**${label}:**\n\n` : '');
      return;
    }
    if (handler === 'nodeDocumentation') {
      const name = attribute(node, 'node');
      unwrap(
        node,
        name ? `Node definition source: ${NODE_SOURCE_DIRECTORY}/${name}/ (schema.ts, uischema.ts)\n\n` : '',
      );
      return;
    }
    const slug = attribute(node, 'slug');
    if (!slug) throw new Error(`${context.filePath}: <PropsTable> has no slug`);
    const types = context.propsTypes(slug);
    if (types === undefined) throw new Error(`${context.filePath}: <PropsTable slug="${slug}"> is not in COMPONENTS`);
    slugs.push(slug);
    replaceNode(
      node,
      types && types.length > 0 ? `Props: see get_symbol ${types.map((type) => `ui:${type}`).join(', ')}` : '',
    );
  };

  const applyRule = (node: AstNode, rule: MdxRule) => {
    switch (rule.action) {
      case 'remove': {
        replaceNode(node, '');
        return;
      }
      case 'unwrap': {
        unwrap(node, '');
        return;
      }
      case 'replace': {
        replaceNode(node, applyTemplate(rule.template, node) ?? '');
        return;
      }
      case 'special': {
        applySpecial(node, rule.handler);
        return;
      }
    }
  };

  const inlinePartial = (node: AstNode, partialPath: string) => {
    if ((context.depth ?? 0) >= MAX_PARTIAL_DEPTH) throw new Error(`${context.filePath}: partials nested too deeply`);
    const partialSource = splitFrontmatter(context.readPartial(partialPath)).body;
    const cleaned = cleanBody(partialSource, { ...context, filePath: partialPath, depth: (context.depth ?? 0) + 1 });
    slugs.push(...cleaned.propsTableSlugs);
    replaceNode(node, cleaned.text.trim());
  };

  const visit = (node: AstNode) => {
    switch (node.type) {
      case 'mdxjsEsm': {
        replaceNode(node, '');
        return;
      }
      case 'mdxFlowExpression':
      case 'mdxTextExpression': {
        const expression = node.value ?? '';
        replaceNode(
          node,
          JSX_COMMENT.test(expression) ? '' : (lookupPath(jsonValues, expression) ?? `{${expression}}`),
        );
        return;
      }
      case 'image': {
        replaceNode(node, node.alt ? `[image: ${node.alt}]` : '');
        return;
      }
      case 'code':
      case 'inlineCode': {
        return;
      }
    }
    if (isMdxJsx(node)) {
      const name = node.name ?? '';
      const partial = partials.get(name);
      if (partial) {
        inlinePartial(node, partial);
        return;
      }
      applyRule(node, components[name] ?? { action: 'unwrap' });
      return;
    }
    visitChildren(node);
  };

  visit(tree);
  return edits;
}

function applyEdits(source: string, edits: Edit[]) {
  let result = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start || b.end - a.end)) {
    result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  }
  return result;
}

function cleanBody(body: string, context: CleanContext): CleanResult {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(body) as unknown as AstNode;
  const slugs: string[] = [];
  const edits = collectEdits(body, tree, context, slugs);
  return { text: collapseBlankLines(applyEdits(body, edits)), propsTableSlugs: slugs };
}

function stripHtmlComments(body: string) {
  const tree = unified().use(remarkParse).parse(body) as unknown as AstNode;
  const edits: Edit[] = [];
  const walk = (node: AstNode) => {
    if (node.type === 'html' && node.value?.startsWith('<!--')) edits.push({ ...offsets(node), replacement: '' });
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);
  return collapseBlankLines(applyEdits(body, edits));
}

export function cleanDocument(body: string, extension: '.md' | '.mdx', context: CleanContext): CleanResult {
  if (extension === '.md') return { text: stripHtmlComments(body), propsTableSlugs: [] };
  return cleanBody(body, context);
}
