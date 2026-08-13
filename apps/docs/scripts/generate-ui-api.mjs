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
import { existsSync, globSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { COMPONENTS } from './ui-components.mjs';

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

function findTypeByName(root, name, warnings) {
  const matches = [];
  (function walk(node) {
    // 2097152 = TypeAlias, 256 = Interface
    if (node.name === name && (node.kind === 2_097_152 || node.kind === 256)) matches.push(node);
    for (const child of node.children ?? []) walk(child);
  })(root);
  if (matches.length > 1 && warnings) {
    warnings.push(`type name "${name}" is ambiguous (${matches.length} declarations) - the table would document whichever TypeDoc emitted first`);
  }
  return matches[0] ?? null;
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

// A component whose props extend a native element's attributes accepts far
// more than the table lists (`placeholder`, `value`, `onChange`, aria-*, ...).
// Enumerating ~280 DOM attributes would drown the table, so record which
// element it forwards to and let the page say so in one line.
const NATIVE_ATTRIBUTE_TYPES = new Map([
  ['InputHTMLAttributes', 'input'],
  ['ButtonHTMLAttributes', 'button'],
  ['TextareaHTMLAttributes', 'textarea'],
  ['SelectHTMLAttributes', 'select'],
  ['AnchorHTMLAttributes', 'a'],
  ['HTMLAttributes', 'element'],
]);

function findNativeElement(typeNode, byId, depth = 0) {
  if (!typeNode || depth > 8) return null;
  if (typeNode.type === 'reference') {
    // TypeDoc keeps the qualifier when the import is namespaced (`React.HTMLAttributes`).
    const element = NATIVE_ATTRIBUTE_TYPES.get(typeNode.name.replace(/^React\./, ''));
    if (element === 'element') {
      // Plain HTMLAttributes<T> - name the element from its type argument.
      const tag = /^HTML(\w*?)Element$/.exec(typeNode.typeArguments?.[0]?.name ?? '')?.[1];
      return tag ? tag.toLowerCase() || 'element' : 'element';
    }
    if (element) return element;
    // A first-party alias can carry it indirectly (BaseButtonProps -> ButtonHTMLAttributes).
    if (typeof typeNode.target === 'number') {
      const found = findNativeElement(byId.get(typeNode.target)?.type, byId, depth + 1);
      if (found) return found;
    }
  }
  // The reference is usually wrapped: `Omit<InputHTMLAttributes<…>, 'size'>`.
  for (const nested of [...(typeNode.types ?? []), ...(typeNode.typeArguments ?? [])]) {
    const found = findNativeElement(nested, byId, depth + 1);
    if (found) return found;
  }
  return null;
}

// Collect own properties from a prop type alias / interface, walking
// intersections and skipping referenced (extended / native HTML) members.
function collectProps(typeNode, byId, accumulator = new Map(), context = null) {
  if (!typeNode) return accumulator;
  // TypeAlias / Interface: plain object members land directly on `.children`;
  // computed types (intersections etc.) land on `.type`.
  if (typeNode.kind === 2_097_152 || typeNode.kind === 256) {
    if (typeNode.children?.length) {
      for (const child of typeNode.children) addProperty(child, byId, accumulator);
      return accumulator;
    }
    return collectProps(typeNode.type, byId, accumulator, context);
  }
  if (typeNode.type === 'intersection' || typeNode.type === 'union') {
    for (const member of typeNode.types) collectProps(member, byId, accumulator, context);
    return accumulator;
  }
  if (typeNode.type === 'reflection' && typeNode.declaration?.children) {
    for (const child of typeNode.declaration.children) addProperty(child, byId, accumulator);
    return accumulator;
  }
  if (typeNode.type === 'reference' && typeof typeNode.target === 'number') {
    const target = byId.get(typeNode.target);
    // Only follow references into our own package's prop types, not native ones.
    // Both declaration forms count - a prop type written as an interface is as
    // valid a target as a type alias.
    if (target && (target.kind === 2_097_152 || target.kind === 256)) {
      collectProps(target, byId, accumulator, context);
    }
    return accumulator;
  }
  // An unfollowed generic reference (Partial<X>, Omit<X, ...>) silently drops
  // every prop of a first-party X - warn instead of shipping a slimmer table.
  if (typeNode.type === 'reference' && typeNode.typeArguments?.length && context) {
    const firstParty = typeNode.typeArguments.find(
      (argument) => argument.type === 'reference' && typeof argument.target === 'number' && byId.get(argument.target),
    );
    if (firstParty) {
      context.warnings.push(
        `"${context.slug}": props of ${firstParty.name} are hidden behind ${typeNode.name}<...> - unwrap the utility type or extend the generator`,
      );
    }
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
function collectVariantProps(propsTypeNames, project, byId, warnings, slug, context) {
  const perVariant = [];
  for (const typeName of propsTypeNames) {
    const typeNode = findTypeByName(project, typeName, warnings);
    if (!typeNode) {
      warnings.push(`props type "${typeName}" not found for "${slug}"`);
      continue;
    }
    context.nativeElement ??= findNativeElement(typeNode.type, byId);
    perVariant.push({ typeName, props: collectProps(typeNode, byId, new Map(), context) });
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

    // Required only when required in EVERY variant: `value` (controlled) and
    // `defaultValue` (uncontrolled) marked required side by side would
    // document a call that cannot exist. The variant note carries the detail.
    const requiredEverywhere =
      occurrences.length === perVariant.length && occurrences.every((o) => o.prop.required);
    const requiredInItsVariants = !requiredEverywhere && occurrences.every((o) => o.prop.required);

    const base = occurrences[0].prop;
    let description = base.description;
    if (!sharedByAll) {
      const variantLabel = (typeName) => typeName.replace(/Props$/, '');
      const variants = occurrences.map((o) => variantLabel(o.typeName)).join(', ');
      const note =
        distinctTypes.size > 1
          ? `Type varies by variant (${occurrences.map((o) => `${variantLabel(o.typeName)}: ${o.prop.type}`).join(', ')}).`
          : requiredInItsVariants
            ? `Only applies to the ${variants} variant (required there).`
            : `Only applies to the ${variants} variant.`;
      description = description ? `${description} ${note}` : note;
    }

    merged.set(propertyName, {
      name: propertyName,
      type: sharedByAll ? base.type : [...distinctTypes].join(' | '),
      required: requiredEverywhere,
      default: base.default,
      description,
    });
  }
  return merged;
}

function extractCssVariables(directory, warnings, slug) {
  // An entry that documents an API rather than a styled component (a hook, say)
  // carries no directory - its page renders the owning component's variables.
  if (!directory) return [];

  const abs = path.resolve(uiSource, 'components', directory);
  if (!existsSync(abs)) {
    // globSync on a missing directory returns [] - the page would then claim
    // the component exposes no CSS variables.
    warnings.push(`"${slug}": component directory ${directory} does not exist`);
    return [];
  }
  // Subcomponents with their own COMPONENTS entry document their own
  // variables - without this a parent page repeats them and offers overrides
  // that do nothing there (Button listing NavButton's, Switch IconSwitch's).
  const nestedPrefixes = COMPONENTS.map((component) => component.dir)
    .filter((nested) => nested?.startsWith(`${directory}/`))
    .map((nested) => `${nested.slice(directory.length + 1)}/`);

  const files = globSync('**/*.css', { cwd: abs })
    .filter((file) => !nestedPrefixes.some((prefix) => file.startsWith(prefix)))
    .sort();
  const seen = new Set();
  const variables = [];
  for (const file of files) {
    const css = readFileSync(path.resolve(abs, file), 'utf8');
    // Match `--ax-public-xxx: value` declarations, capturing the value and an
    // optional same-line comment.
    const re = /(--ax-public-[\w-]+)\s*:\s*([^;]*?)(?:\/\*\s*(.*?)\s*\*\/)?\s*;/g;
    let m;
    while ((m = re.exec(css))) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      const comment = (m[3] ?? '').trim();
      variables.push({
        name: m[1],
        kind: valueKind(m[2].trim()),
        comment: INTERNAL_NOTE_RE.test(comment) ? '' : comment,
      });
    }
  }
  return variables;
}

// Groups the docs table by what the variable resolves to, not by what its name
// suggests: `edge-stroke-width` is a length and `snackbar-success-border` is a
// color, and neither reads that way from the name alone. Values usually point
// at a design token, so the token stylesheets are followed to the literal.
const LITERAL_COLOR_RE = /^(#|rgb|hsl|oklch|color-mix|linear-gradient|radial-gradient|transparent\b|currentColor\b)/i;

const tokenValues = readTokenValues();

function readTokenValues() {
  const values = new Map();
  const tokenDistribution = path.resolve(repoRoot, 'packages/tokens/dist');
  if (!existsSync(tokenDistribution)) return values;
  for (const file of globSync('*.css', { cwd: tokenDistribution })) {
    const css = readFileSync(path.resolve(tokenDistribution, file), 'utf8');
    for (const [, name, value] of css.matchAll(/(--ax-[\w-]+)\s*:\s*([^;]+);/g)) {
      if (!values.has(name)) values.set(name, value.trim());
    }
  }
  return values;
}

function valueKind(value, depth = 0) {
  if (LITERAL_COLOR_RE.test(value)) return 'color';
  const referenced = /var\(\s*(--[\w-]+)/.exec(value);
  if (!referenced || depth > 8) return 'size';
  const resolved = tokenValues.get(referenced[1]);
  return resolved ? valueKind(resolved, depth + 1) : 'size';
}

async function main() {
  const project = await runTypedoc();
  const byId = indexById(project);
  const out = {};
  const warnings = [];

  for (const component of COMPONENTS) {
    let props = [];
    const context = { warnings, slug: component.slug };
    if (Array.isArray(component.propsType)) {
      props = [...collectVariantProps(component.propsType, project, byId, warnings, component.slug, context).values()].sort(
        (a, b) => a.name.localeCompare(b.name),
      );
    } else if (component.propsType) {
      const typeNode = findTypeByName(project, component.propsType, warnings);
      if (typeNode) {
        context.nativeElement = findNativeElement(typeNode.type, byId);
        props = [...collectProps(typeNode, byId, new Map(), context).values()].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      } else {
        warnings.push(`props type "${component.propsType}" not found for "${component.slug}"`);
      }
    }
    out[component.slug] = {
      name: component.name,
      props,
      nativeElement: context.nativeElement ?? null,
      cssVariables: extractCssVariables(component.dir, warnings, component.slug),
    };
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
