/*
 * Generates `src/generated/ui-api.json` for the UI Library docs.
 *
 * Props are extracted with TypeDoc (source of truth: the component prop types
 * in `@workflowbuilder/ui`); CSS variables are extracted from each component's
 * stylesheets. The per-component docs pages render this JSON, so the Props and
 * CSS variables tables never drift from source. Run by `pnpm generate:ui-api`
 * and as a prebuild step in `dev` / `build`.
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(here, '..');
const repoRoot = path.resolve(docsRoot, '../..');
const uiSrc = path.resolve(repoRoot, 'packages/ui/src');
const outFile = path.resolve(docsRoot, 'src/generated/ui-api.json');
const tdJson = path.resolve(docsRoot, 'node_modules/.cache/ui-typedoc.json');

// slug -> { name, propsType, dir }. `propsType` is the exported prop type the
// component accepts; `dir` is the component folder under packages/ui/src/components.
const COMPONENTS = [
  { slug: 'accordion', name: 'Accordion', propsType: 'AccordionProps', dir: 'accordion' },
  { slug: 'avatar', name: 'Avatar', propsType: 'AvatarProps', dir: 'avatar' },
  { slug: 'button', name: 'Button', propsType: 'BaseRegularButtonProps', dir: 'button' },
  { slug: 'checkbox', name: 'Checkbox', propsType: 'CheckboxProps', dir: 'checkbox' },
  { slug: 'date-picker', name: 'DatePicker', propsType: 'DatePickerProps', dir: 'date-picker' },
  { slug: 'input', name: 'Input', propsType: 'InputProps', dir: 'input' },
  { slug: 'menu', name: 'Menu', propsType: 'MenuProps', dir: 'menu' },
  { slug: 'modal', name: 'Modal', propsType: 'ModalProps', dir: 'modal' },
  { slug: 'nav-button', name: 'NavButton', propsType: 'NavBaseButtonProps', dir: 'button/nav-button' },
  { slug: 'radio', name: 'Radio', propsType: 'RadioProps', dir: 'radio-button' },
  { slug: 'segment-picker', name: 'SegmentPicker', propsType: 'SegmentPickerProps', dir: 'segment-picker' },
  { slug: 'select', name: 'Select', propsType: 'SelectBaseProps', dir: 'select' },
  { slug: 'separator', name: 'Separator', propsType: null, dir: 'separator' },
  { slug: 'snackbar', name: 'Snackbar', propsType: 'SnackbarProps', dir: 'snackbar' },
  { slug: 'status', name: 'Status', propsType: 'StatusProps', dir: 'status' },
  { slug: 'switch', name: 'Switch', propsType: 'BaseSwitchProps', dir: 'switch' },
  { slug: 'text-area', name: 'TextArea', propsType: 'TextAreaProps', dir: 'text-area' },
  { slug: 'tooltip', name: 'Tooltip', propsType: 'TooltipProps', dir: 'tooltip' },
  // Diagram components (props extracted the same way; NodePanel is a compound
  // component documented narratively, so it has no flat props entry here).
  { slug: 'node-icon', name: 'NodeIcon', propsType: 'NodeIconProps', dir: 'node/node-icon' },
  { slug: 'node-description', name: 'NodeDescription', propsType: 'NodeDescriptionProps', dir: 'node/node-description' },
  { slug: 'node-as-port-wrapper', name: 'NodeAsPortWrapper', propsType: 'NodeAsPortWrapperProps', dir: 'node/node-as-port-wrapper' },
  { slug: 'edge', name: 'EdgeLabel', propsType: 'EdgeLabelProps', dir: 'edge' },
];

async function runTypedoc() {
  await mkdir(path.dirname(tdJson), { recursive: true });
  const bin = path.resolve(docsRoot, 'node_modules/.bin/typedoc');
  await promisify(execFile)(
    bin,
    [
      '--json', tdJson,
      '--entryPoints', path.resolve(uiSrc, 'index.ts'),
      '--tsconfig', path.resolve(repoRoot, 'packages/ui/tsconfig.json'),
      '--excludeExternals', '--excludePrivate', '--skipErrorChecking', '--logLevel', 'Error',
    ],
    { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(await readFile(tdJson, 'utf8'));
}

function indexById(root) {
  const byId = new Map();
  (function walk(node) {
    if (node && typeof node.id === 'number') byId.set(node.id, node);
    for (const child of node.children ?? []) walk(child);
  })(root);
  return byId;
}

function findTypeByName(root, name) {
  let found = null;
  (function walk(node) {
    if (found) return;
    // 2097152 = TypeAlias, 256 = Interface
    if (node.name === name && (node.kind === 2097152 || node.kind === 256)) found = node;
    for (const child of node.children ?? []) walk(child);
  })(root);
  return found;
}

function typeToString(t, byId, depth = 0) {
  if (!t || depth > 6) return 'unknown';
  switch (t.type) {
    case 'intrinsic': return t.name;
    case 'literal': return typeof t.value === 'string' ? `'${t.value}'` : String(t.value);
    case 'reference': {
      const args = t.typeArguments?.length ? `<${t.typeArguments.map((a) => typeToString(a, byId, depth + 1)).join(', ')}>` : '';
      return `${t.name}${args}`;
    }
    case 'union': return t.types.map((x) => typeToString(x, byId, depth + 1)).join(' | ');
    case 'intersection': return t.types.map((x) => typeToString(x, byId, depth + 1)).join(' & ');
    case 'array': return `${typeToString(t.elementType, byId, depth + 1)}[]`;
    case 'tuple': return `[${(t.elements ?? []).map((x) => typeToString(x, byId, depth + 1)).join(', ')}]`;
    case 'reflection': {
      const sig = t.declaration?.signatures?.[0];
      if (sig) {
        const params = (sig.parameters ?? []).map((p) => `${p.name}: ${typeToString(p.type, byId, depth + 1)}`).join(', ');
        return `(${params}) => ${typeToString(sig.type, byId, depth + 1)}`;
      }
      return '{ … }';
    }
    case 'indexedAccess': return `${typeToString(t.objectType, byId, depth + 1)}[${typeToString(t.indexType, byId, depth + 1)}]`;
    case 'templateLiteral': return 'string';
    case 'query': return typeToString(t.queryType, byId, depth + 1);
    case 'predicate': return 'boolean';
    case 'typeOperator': return `${t.operator} ${typeToString(t.target, byId, depth + 1)}`;
    default: return t.name ?? 'unknown';
  }
}

function summaryText(comment) {
  if (!comment?.summary) return '';
  return comment.summary.map((s) => s.text).join('').trim();
}

function defaultTag(comment) {
  const tag = (comment?.blockTags ?? []).find((b) => b.tag === '@default' || b.tag === '@defaultValue');
  if (!tag) return null;
  let value = tag.content.map((c) => c.text).join('').trim();
  value = value.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim(); // strip ```ts … ``` fences
  value = value.replace(/^`+|`+$/g, '').trim(); // strip inline backticks
  return value || null;
}

// Collect own properties from a prop type alias / interface, walking
// intersections and skipping referenced (extended / native HTML) members.
function collectProps(typeNode, byId, acc = new Map()) {
  if (!typeNode) return acc;
  // TypeAlias / Interface: plain object members land directly on `.children`;
  // computed types (intersections etc.) land on `.type`.
  if (typeNode.kind === 2097152 || typeNode.kind === 256) {
    if (typeNode.children?.length) {
      for (const child of typeNode.children) addProp(child, byId, acc);
      return acc;
    }
    return collectProps(typeNode.type, byId, acc);
  }
  if (typeNode.type === 'intersection' || typeNode.type === 'union') {
    for (const member of typeNode.types) collectProps(member, byId, acc);
    return acc;
  }
  if (typeNode.type === 'reflection' && typeNode.declaration?.children) {
    for (const child of typeNode.declaration.children) addProp(child, byId, acc);
    return acc;
  }
  if (typeNode.type === 'reference' && typeof typeNode.target === 'number') {
    const target = byId.get(typeNode.target);
    // Only follow references into our own package's prop types, not native ones.
    if (target && target.kind === 2097152) collectProps(target, byId, acc);
    return acc;
  }
  return acc;
}

function addProp(child, byId, acc) {
  if (child.kind !== 1024 || acc.has(child.name)) return; // 1024 = Property
  acc.set(child.name, {
    name: child.name,
    type: typeToString(child.type, byId),
    required: !child.flags?.isOptional,
    default: defaultTag(child.comment),
    description: summaryText(child.comment),
  });
}

function extractCssVariables(dir) {
  const abs = path.resolve(uiSrc, 'components', dir);
  const files = globSync('**/*.css', { cwd: abs }).sort();
  const seen = new Set();
  const vars = [];
  for (const file of files) {
    const css = readFileSync(path.resolve(abs, file), 'utf8');
    // Match `--ax-public-xxx:` declarations, capturing an optional same-line comment.
    const re = /(--ax-public-[\w-]+)\s*:[^;]*?(?:\/\*\s*(.*?)\s*\*\/)?\s*;/g;
    let m;
    while ((m = re.exec(css))) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      vars.push({ name: m[1], comment: (m[2] ?? '').trim() });
    }
  }
  return vars;
}

async function main() {
  const project = await runTypedoc();
  const byId = indexById(project);
  const out = {};
  const warnings = [];

  for (const c of COMPONENTS) {
    let props = [];
    if (c.propsType) {
      const typeNode = findTypeByName(project, c.propsType);
      if (typeNode) {
        props = [...collectProps(typeNode, byId).values()].sort((a, b) => a.name.localeCompare(b.name));
      } else {
        warnings.push(`props type "${c.propsType}" not found for "${c.slug}"`);
      }
    }
    out[c.slug] = { name: c.name, props, cssVariables: extractCssVariables(c.dir) };
  }

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(out, null, 2) + '\n');

  const summary = Object.entries(out).map(([s, v]) => `${s}: ${v.props.length} props, ${v.cssVariables.length} vars`);
  console.log('✔ ui-api.json generated\n  ' + summary.join('\n  '));
  if (warnings.length) console.warn('⚠ ' + warnings.join('\n⚠ '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
