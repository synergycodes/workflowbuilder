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
import { globSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const documentsRoot = path.resolve(here, '..');
const repoRoot = path.resolve(documentsRoot, '../..');
const uiSource = path.resolve(repoRoot, 'packages/ui/src');
const outFile = path.resolve(documentsRoot, 'src/generated/ui-api.json');
const tdJson = path.resolve(documentsRoot, 'node_modules/.cache/ui-typedoc.json');

// Comment patterns that are engineering notes on the token pipeline, not
// public documentation - stripped so they never render as CSS variable
// descriptions in the docs (see e.g. status.module.css, icon-size.module.css).
const INTERNAL_NOTE_RE = /missing token/i;

// slug -> { name, propsType, dir }. `propsType` is the exported prop type the
// component accepts (or the list of variant prop types for a component whose
// public surface is a discriminated union - see collectVariantProps); `dir`
// is the component folder under packages/ui/src/components.
const COMPONENTS = [
  { slug: 'accordion', name: 'Accordion', propsType: 'AccordionProps', dir: 'accordion' },
  { slug: 'avatar', name: 'Avatar', propsType: 'AvatarProps', dir: 'avatar' },
  // Button has no single public props type - it renders one of three variant
  // components depending on `children` (label / icon / icon+label). Merge
  // their prop sets instead of documenting only the shared base.
  {
    slug: 'button',
    name: 'Button',
    propsType: ['LabelButtonProps', 'IconButtonProps', 'IconLabelButtonProps'],
    dir: 'button',
  },
  { slug: 'checkbox', name: 'Checkbox', propsType: 'CheckboxProps', dir: 'checkbox' },
  { slug: 'collapsible', name: 'Collapsible', propsType: 'CollapsibleProps', dir: 'collapsible' },
  { slug: 'date-picker', name: 'DatePicker', propsType: 'DatePickerProps', dir: 'date-picker' },
  { slug: 'icon-switch', name: 'IconSwitch', propsType: 'IconSwitchProps', dir: 'switch/icon-switch' },
  { slug: 'input', name: 'Input', propsType: 'InputProps', dir: 'input' },
  { slug: 'menu', name: 'Menu', propsType: 'MenuProps', dir: 'menu' },
  { slug: 'modal', name: 'Modal', propsType: 'ModalProps', dir: 'modal' },
  {
    slug: 'nav-button',
    name: 'NavButton',
    propsType: ['NavLabelButtonProps', 'NavIconButtonProps', 'NavIconLabelButtonProps'],
    dir: 'button/nav-button',
  },
  { slug: 'radio', name: 'Radio', propsType: 'RadioProps', dir: 'radio-button' },
  {
    slug: 'segment-picker',
    name: 'SegmentPicker',
    propsType: ['ControlledSegmentPickerProps', 'UncontrolledSegmentPickerProps'],
    dir: 'segment-picker',
  },
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
  {
    slug: 'node-description',
    name: 'NodeDescription',
    propsType: 'NodeDescriptionProps',
    dir: 'node/node-description',
  },
  {
    slug: 'node-as-port-wrapper',
    name: 'NodeAsPortWrapper',
    propsType: 'NodeAsPortWrapperProps',
    dir: 'node/node-as-port-wrapper',
  },
  { slug: 'edge', name: 'EdgeLabel', propsType: 'EdgeLabelProps', dir: 'edge' },
];

async function runTypedoc() {
  await mkdir(path.dirname(tdJson), { recursive: true });
  const bin = path.resolve(documentsRoot, 'node_modules/.bin/typedoc');
  await promisify(execFile)(
    bin,
    [
      '--json',
      tdJson,
      // `expand` over the whole components tree (rather than resolving just
      // `index.ts`'s re-exports) so that per-variant prop types like
      // LabelButtonProps/IconButtonProps/IconLabelButtonProps - not
      // individually re-exported from the package barrel, only reachable
      // through the Button component's overloaded signature - still get a
      // full type reflection collectVariantProps can look up by name.
      '--entryPoints',
      path.resolve(uiSource, 'components'),
      // `shared` must be an entry too: helper prop types like WithIcon live
      // there, and a type outside the entry tree gets no reflection - its
      // intersection members (e.g. Accordion/Modal's `icon`) silently vanish
      // from the generated tables.
      '--entryPoints',
      path.resolve(uiSource, 'shared'),
      '--entryPointStrategy',
      'expand',
      '--tsconfig',
      path.resolve(repoRoot, 'packages/ui/tsconfig.json'),
      '--excludeExternals',
      '--excludePrivate',
      '--skipErrorChecking',
      '--logLevel',
      'Error',
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
    if (node.name === name && (node.kind === 2_097_152 || node.kind === 256)) found = node;
    for (const child of node.children ?? []) walk(child);
  })(root);
  return found;
}

function typeToString(t, byId, depth = 0) {
  if (!t || depth > 6) return 'unknown';
  switch (t.type) {
    case 'intrinsic': {
      return t.name;
    }
    case 'literal': {
      return typeof t.value === 'string' ? `'${t.value}'` : String(t.value);
    }
    case 'reference': {
      const arguments_ = t.typeArguments?.length
        ? `<${t.typeArguments.map((a) => typeToString(a, byId, depth + 1)).join(', ')}>`
        : '';
      return `${t.name}${arguments_}`;
    }
    case 'union': {
      return t.types.map((x) => typeToString(x, byId, depth + 1)).join(' | ');
    }
    case 'intersection': {
      return t.types.map((x) => typeToString(x, byId, depth + 1)).join(' & ');
    }
    case 'array': {
      return `${typeToString(t.elementType, byId, depth + 1)}[]`;
    }
    case 'tuple': {
      return `[${(t.elements ?? []).map((x) => typeToString(x, byId, depth + 1)).join(', ')}]`;
    }
    case 'reflection': {
      const sig = t.declaration?.signatures?.[0];
      if (sig) {
        const params = (sig.parameters ?? [])
          .map((p) => `${p.name}: ${typeToString(p.type, byId, depth + 1)}`)
          .join(', ');
        return `(${params}) => ${typeToString(sig.type, byId, depth + 1)}`;
      }
      return '{ … }';
    }
    case 'indexedAccess': {
      return `${typeToString(t.objectType, byId, depth + 1)}[${typeToString(t.indexType, byId, depth + 1)}]`;
    }
    case 'templateLiteral': {
      return 'string';
    }
    case 'query': {
      return typeToString(t.queryType, byId, depth + 1);
    }
    case 'predicate': {
      return 'boolean';
    }
    case 'typeOperator': {
      return `${t.operator} ${typeToString(t.target, byId, depth + 1)}`;
    }
    default: {
      return t.name ?? 'unknown';
    }
  }
}

function summaryText(comment) {
  if (!comment?.summary) return '';
  return comment.summary
    .map((s) => s.text)
    .join('')
    .trim();
}

function defaultTag(comment) {
  const tag = (comment?.blockTags ?? []).find((b) => b.tag === '@default' || b.tag === '@defaultValue');
  if (!tag) return null;
  let value = tag.content
    .map((c) => c.text)
    .join('')
    .trim();
  value = value
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```$/, '')
    .trim(); // strip ```ts … ``` fences
  value = value.replaceAll(/^`+|`+$/g, '').trim(); // strip inline backticks
  return value || null;
}

// Collect own properties from a prop type alias / interface, walking
// intersections and skipping referenced (extended / native HTML) members.
function collectProps(typeNode, byId, accumulator = new Map()) {
  if (!typeNode) return accumulator;
  // TypeAlias / Interface: plain object members land directly on `.children`;
  // computed types (intersections etc.) land on `.type`.
  if (typeNode.kind === 2_097_152 || typeNode.kind === 256) {
    if (typeNode.children?.length) {
      for (const child of typeNode.children) addProperty(child, byId, accumulator);
      return accumulator;
    }
    return collectProps(typeNode.type, byId, accumulator);
  }
  if (typeNode.type === 'intersection' || typeNode.type === 'union') {
    for (const member of typeNode.types) collectProps(member, byId, accumulator);
    return accumulator;
  }
  if (typeNode.type === 'reflection' && typeNode.declaration?.children) {
    for (const child of typeNode.declaration.children) addProperty(child, byId, accumulator);
    return accumulator;
  }
  if (typeNode.type === 'reference' && typeof typeNode.target === 'number') {
    const target = byId.get(typeNode.target);
    // Only follow references into our own package's prop types, not native ones.
    if (target && target.kind === 2_097_152) collectProps(target, byId, accumulator);
    return accumulator;
  }
  return accumulator;
}

function addProperty(child, byId, accumulator) {
  if (child.kind !== 1024 || accumulator.has(child.name)) return; // 1024 = Property
  accumulator.set(child.name, {
    name: child.name,
    type: typeToString(child.type, byId),
    required: !child.flags?.isOptional,
    default: defaultTag(child.comment),
    description: summaryText(child.comment),
  });
}

// Merge the prop sets of a discriminated-union component's variants (e.g.
// Button's Label/Icon/IconLabel components). Props shared by every variant
// with the same type are documented once, unqualified; props that are
// variant-specific (missing from, or typed differently in, some variants)
// get a note appended to their description so the table stays a single flat
// list without a separate "variants" column.
function collectVariantProps(propsTypeNames, project, byId, warnings, slug) {
  const perVariant = [];
  for (const typeName of propsTypeNames) {
    const typeNode = findTypeByName(project, typeName);
    if (!typeNode) {
      warnings.push(`props type "${typeName}" not found for "${slug}"`);
      continue;
    }
    perVariant.push({ typeName, props: collectProps(typeNode, byId) });
  }

  const propertyNames = new Set();
  for (const variant of perVariant) for (const name of variant.props.keys()) propertyNames.add(name);

  const merged = new Map();
  for (const propertyName of propertyNames) {
    const occurrences = perVariant
      .filter((variant) => variant.props.has(propertyName))
      .map((variant) => ({ typeName: variant.typeName, prop: variant.props.get(propertyName) }))
      // `foo?: never` marks a prop as forbidden in that variant - treat it as absent.
      .filter((occurrence) => occurrence.prop.type !== 'never');
    if (occurrences.length === 0) continue;
    const distinctTypes = new Set(occurrences.map((o) => o.prop.type));
    const sharedByAll = occurrences.length === perVariant.length && distinctTypes.size === 1;

    const base = occurrences[0].prop;
    let description = base.description;
    if (!sharedByAll) {
      const variantLabel = (typeName) => typeName.replace(/Props$/, '');
      const note =
        distinctTypes.size > 1
          ? `Type varies by variant (${occurrences.map((o) => `${variantLabel(o.typeName)}: ${o.prop.type}`).join(', ')}).`
          : `Only applies to the ${occurrences.map((o) => variantLabel(o.typeName)).join(', ')} variant.`;
      description = description ? `${description} ${note}` : note;
    }

    merged.set(propertyName, {
      name: propertyName,
      type: sharedByAll ? base.type : [...distinctTypes].join(' | '),
      required: occurrences.every((o) => o.prop.required),
      default: base.default,
      description,
    });
  }
  return merged;
}

function extractCssVariables(directory) {
  const abs = path.resolve(uiSource, 'components', directory);
  const files = globSync('**/*.css', { cwd: abs }).sort();
  const seen = new Set();
  const variables = [];
  for (const file of files) {
    const css = readFileSync(path.resolve(abs, file), 'utf8');
    // Match `--ax-public-xxx:` declarations, capturing an optional same-line comment.
    const re = /(--ax-public-[\w-]+)\s*:[^;]*?(?:\/\*\s*(.*?)\s*\*\/)?\s*;/g;
    let m;
    while ((m = re.exec(css))) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      const comment = (m[2] ?? '').trim();
      variables.push({ name: m[1], comment: INTERNAL_NOTE_RE.test(comment) ? '' : comment });
    }
  }
  return variables;
}

async function main() {
  const project = await runTypedoc();
  const byId = indexById(project);
  const out = {};
  const warnings = [];

  for (const component of COMPONENTS) {
    let props = [];
    if (Array.isArray(component.propsType)) {
      props = [...collectVariantProps(component.propsType, project, byId, warnings, component.slug).values()].sort(
        (a, b) => a.name.localeCompare(b.name),
      );
    } else if (component.propsType) {
      const typeNode = findTypeByName(project, component.propsType);
      if (typeNode) {
        props = [...collectProps(typeNode, byId).values()].sort((a, b) => a.name.localeCompare(b.name));
      } else {
        warnings.push(`props type "${component.propsType}" not found for "${component.slug}"`);
      }
    }
    out[component.slug] = { name: component.name, props, cssVariables: extractCssVariables(component.dir) };
  }

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(out, null, 2) + '\n');

  const summary = Object.entries(out).map(
    ([slug, entry]) => `${slug}: ${entry.props.length} props, ${entry.cssVariables.length} vars`,
  );
  console.log('✔ ui-api.json generated\n  ' + summary.join('\n  '));

  if (warnings.length > 0) {
    // An unresolved props type means a rename/typo silently shipped an empty
    // "no configurable props" page - fail the build instead of warning.
    console.error('✗ ' + warnings.join('\n✗ '));
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
