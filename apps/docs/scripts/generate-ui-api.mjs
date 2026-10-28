/*
 * Generates, for the UI Library docs, `src/generated/ui-api.json` (Props and CSS variables per component) and the
 * UI API Reference inputs: `ui-types.ts` (TypeDoc entry point) and `ui-api-categories.json` (sidebar groups).
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
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { ReflectionKind } from 'typedoc';

import { formatTypeLink, stripTypeLinks } from '../src/ui-api-reference.mjs';
import { COMPONENTS } from './ui-components.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const documentsRoot = path.resolve(here, '..');
const repoRoot = path.resolve(documentsRoot, '../..');
const uiSource = path.resolve(repoRoot, 'packages/ui/src');
const componentsDataFile = path.resolve(documentsRoot, 'src/generated/ui-api.json');
const uiApiReferenceEntryFile = path.resolve(documentsRoot, 'src/generated/ui-types.ts');
// Resolved through the `@ui/*` path alias that tsconfig.ui-api.json inherits from the UI package.
const UI_BARREL_IMPORT = '@ui/index';
const uiApiReferenceCategoriesFile = path.resolve(documentsRoot, 'src/generated/ui-api-categories.json');
const tdJson = path.resolve(documentsRoot, 'node_modules/.cache/ui-typedoc.json');
// node_modules/.bin/typedoc is a POSIX shim that Windows cannot spawn; run the package's own bin with node.
const TYPEDOC_PACKAGE = createRequire(import.meta.url).resolve('typedoc/package.json');
const TYPEDOC_BIN = path.join(
  path.dirname(TYPEDOC_PACKAGE),
  JSON.parse(readFileSync(TYPEDOC_PACKAGE, 'utf8')).bin.typedoc,
);

// Engineering notes in the CSS, never public documentation.
const INTERNAL_NOTE_RE = /missing token/i;

// TypeDoc reads entry points as globs, where a Windows \ is an escape; the run's cwd is repoRoot.
const toGlob = (file) => path.relative(repoRoot, file).replaceAll(path.sep, '/');

async function runTypedoc() {
  await mkdir(path.dirname(tdJson), { recursive: true });
  await promisify(execFile)(
    process.execPath,
    [
      TYPEDOC_BIN,
      '--json',
      tdJson,
      // Whole tree, not the barrel: variant prop types are not re-exported.
      '--entryPoints',
      toGlob(path.resolve(uiSource, 'components')),
      // A type outside the entry tree gets no reflection and vanishes from the tables.
      '--entryPoints',
      toGlob(path.resolve(uiSource, 'shared')),
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

const isAliasOrInterface = (node) => node?.kind === ReflectionKind.TypeAlias || node?.kind === ReflectionKind.Interface;

const flattenReflections = (node) => [node, ...(node.children ?? []).flatMap(flattenReflections)];

function indexById(root) {
  return new Map(
    flattenReflections(root)
      .filter((node) => typeof node.id === 'number')
      .map((node) => [node.id, node]),
  );
}

function findTypeByName(root, name, warnings) {
  const matches = flattenReflections(root).filter((node) => node.name === name && isAliasOrInterface(node));
  if (matches.length > 1 && warnings) {
    warnings.push(
      `type name "${name}" is ambiguous (${matches.length} declarations) - the table would document whichever TypeDoc emitted first`,
    );
  }
  return matches[0] ?? null;
}

const TYPE_DECLARATION_KINDS = new Set([ReflectionKind.TypeAlias, ReflectionKind.Interface, ReflectionKind.Enum]);
const isTypeDeclaration = (node) => TYPE_DECLARATION_KINDS.has(node?.kind);

const linkedTypes = new Set();

const CATEGORY_TAG = '@category';
const WHITESPACE_RE = /\s/;

function categoryOf(node) {
  const categoryTag = node.comment?.blockTags?.find(({ tag }) => tag === CATEGORY_TAG);
  const [categoryText] = categoryTag?.content ?? [];
  return categoryText?.text.trim();
}

const pagePath = (node) => `${categoryOf(node)}/${node.name}`.toLowerCase();

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
        ? `<${t.typeArguments.map((typeArgument) => typeToString(typeArgument, byId, depth + 1)).join(', ')}>`
        : '';
      const target = byId.get(t.target);
      if (!isTypeDeclaration(target)) return `${t.name}${arguments_}`;
      linkedTypes.add(target);
      return `${formatTypeLink(pagePath(target), t.name)}${arguments_}`;
    }
    case 'union': {
      return t.types.map((member) => typeToString(member, byId, depth + 1)).join(' | ');
    }
    case 'intersection': {
      return t.types.map((member) => typeToString(member, byId, depth + 1)).join(' & ');
    }
    case 'array': {
      return `${typeToString(t.elementType, byId, depth + 1)}[]`;
    }
    case 'tuple': {
      return `[${(t.elements ?? []).map((element) => typeToString(element, byId, depth + 1)).join(', ')}]`;
    }
    case 'reflection': {
      const sig = t.declaration?.signatures?.[0];
      if (sig) {
        const params = (sig.parameters ?? [])
          .map((parameter) => `${parameter.name}: ${typeToString(parameter.type, byId, depth + 1)}`)
          .join(', ');
        return `(${params}) => ${typeToString(sig.type, byId, depth + 1)}`;
      }
      return '{ … }';
    }
    case 'indexedAccess': {
      return `${typeToString(t.objectType, byId, depth + 1)}[${typeToString(t.indexType, byId, depth + 1)}]`;
    }
    case 'templateLiteral': {
      const spans = (t.tail ?? []).map(([spanType, text]) => `\${${typeToString(spanType, byId, depth + 1)}}${text}`);
      return `\`${t.head}${spans.join('')}\``;
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

// Which native element a component forwards its remaining props to; listing
// ~280 DOM attributes in the table would drown the props that are ours.
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
    const element = NATIVE_ATTRIBUTE_TYPES.get(typeNode.name.replace(/^React\./, ''));
    if (element === 'element') {
      const tag = /^HTML(\w*?)Element$/.exec(typeNode.typeArguments?.[0]?.name ?? '')?.[1];
      return tag ? tag.toLowerCase() || 'element' : 'element';
    }
    if (element) return element;
    if (typeof typeNode.target === 'number') {
      const found = findNativeElement(byId.get(typeNode.target)?.type, byId, depth + 1);
      if (found) return found;
    }
  }
  for (const nested of [...(typeNode.types ?? []), ...(typeNode.typeArguments ?? [])]) {
    const found = findNativeElement(nested, byId, depth + 1);
    if (found) return found;
  }
  return null;
}

// Own properties of a prop type, walking intersections and skipping native members.
function collectProps(typeNode, byId, accumulator = new Map(), context = null) {
  if (!typeNode) return accumulator;
  if (isAliasOrInterface(typeNode)) {
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
    // Follow first-party prop types only; both declaration forms count.
    if (isAliasOrInterface(target)) {
      collectProps(target, byId, accumulator, context);
    } else if (!target && context) {
      context.warnings.push(
        `"${context.slug}": props of ${typeNode.name} are missing from the table - export the type so TypeDoc emits it`,
      );
    }
    return accumulator;
  }
  if (typeNode.type === 'reference' && typeNode.typeArguments?.length) {
    const [source, keys] = typeNode.typeArguments;
    const sourceIsFirstParty =
      source && source.type === 'reference' && typeof source.target === 'number' && byId.get(source.target);
    if (typeNode.name === 'Omit' || typeNode.name === 'Pick' || typeNode.name === 'Partial') {
      const named = collectProps(source, byId, new Map(), context);
      const listed = new Set(literalNames(keys));
      if (keys && listed.size === 0 && context) {
        context.warnings.push(
          `"${context.slug}": the keys of ${typeNode.name}<...> are not string literals, so the table ${
            typeNode.name === 'Pick' ? 'keeps nothing' : 'drops nothing'
          } - inline the keys or extend the generator`,
        );
      }
      for (const [name, property] of named) {
        const keep = typeNode.name === 'Pick' ? listed.has(name) : !listed.has(name);
        if (!keep) continue;
        const optional = typeNode.name === 'Partial' ? { ...property, required: false } : property;
        if (!accumulator.has(name)) accumulator.set(name, optional);
      }
      return accumulator;
    }
    if (sourceIsFirstParty && context) {
      context.warnings.push(
        `"${context.slug}": props of ${source.name} are hidden behind ${typeNode.name}<...> - unwrap the utility type or extend the generator`,
      );
    }
  }
  return accumulator;
}

// String literals a utility type was given, e.g. the 'children' in Omit<X, 'children'>.
function literalNames(typeNode) {
  if (!typeNode) return [];
  if (typeNode.type === 'literal' && typeof typeNode.value === 'string') return [typeNode.value];
  if (typeNode.type === 'union') return typeNode.types.flatMap((member) => literalNames(member));
  return [];
}

function addProperty(child, byId, accumulator) {
  if (child.kind !== ReflectionKind.Property || accumulator.has(child.name)) return;
  accumulator.set(child.name, {
    name: child.name,
    type: typeToString(child.type, byId),
    required: !child.flags?.isOptional,
    default: defaultTag(child.comment),
    description: summaryText(child.comment),
  });
}

// Merges the variants of a union/overload component into one flat table,
// noting in the description where a prop applies to some variants only.
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
      // `foo?: never` marks a prop forbidden in that variant.
      .filter((occurrence) => occurrence.prop.type !== 'never');
    if (occurrences.length === 0) continue;
    const distinctTypes = new Set(occurrences.map((occurrence) => occurrence.prop.type));
    const sharedByAll = occurrences.length === perVariant.length && distinctTypes.size === 1;

    // Required in every variant, else the table documents an impossible call.
    const requiredEverywhere =
      occurrences.length === perVariant.length && occurrences.every((occurrence) => occurrence.prop.required);
    const requiredInItsVariants = !requiredEverywhere && occurrences.every((occurrence) => occurrence.prop.required);

    const base = occurrences[0].prop;
    let description = base.description;
    if (!sharedByAll) {
      const variantLabel = (typeName) => typeName.replace(/Props$/, '');
      const variants = occurrences.map((occurrence) => variantLabel(occurrence.typeName)).join(', ');
      const typePerVariant = occurrences
        .map((occurrence) => `${variantLabel(occurrence.typeName)}: ${stripTypeLinks(occurrence.prop.type)}`)
        .join(', ');
      const note =
        distinctTypes.size > 1
          ? `Type varies by variant (${typePerVariant}).`
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

// Every type the Props tables link to, plus the types those mention: rendering a type marks the types it mentions,
// and a Set's iteration visits entries added during it.
function collectLinkedTypes(byId, warnings) {
  for (const node of linkedTypes) {
    const category = categoryOf(node);
    if (!category) warnings.push(`type "${node.name}" has no @category - the UI API Reference cannot place it`);
    else if (WHITESPACE_RE.test(category)) {
      warnings.push(`@category "${category}" of "${node.name}" has a space - use one word`);
    }
    collectProps(node, byId);
    typeToString(node.type, byId);
  }
  return [...linkedTypes];
}

function extractCssVariables(directory, cssSources, warnings, slug) {
  // No directory - the entry documents an API, not a styled component.
  if (!directory) return [];

  const abs = path.resolve(uiSource, 'components', directory);
  if (!existsSync(abs)) {
    warnings.push(`"${slug}": component directory ${directory} does not exist`);
    return [];
  }
  // Subcomponents with their own page document their own variables; an
  // override offered on the parent page would do nothing.
  const nestedPrefixes = COMPONENTS.map((component) => component.dir)
    .filter((nested) => nested?.startsWith(`${directory}/`))
    .map((nested) => `${nested.slice(directory.length + 1)}/`);

  const files = globSync('**/*.css', { cwd: abs })
    .filter((file) => !nestedPrefixes.some((prefix) => file.startsWith(prefix)))
    .sort()
    .map((file) => path.resolve(abs, file));
  for (const source of cssSources ?? []) {
    const sourcePath = path.resolve(uiSource, source);
    if (existsSync(sourcePath)) files.push(sourcePath);
    else warnings.push(`"${slug}": CSS source ${source} does not exist`);
  }
  const seen = new Set();
  const variables = [];
  for (const file of files) {
    const css = readFileSync(file, 'utf8');
    const re = /(--wb-public-[\w-]+)\s*:\s*([^;]*?)(?:\/\*\s*(.*?)\s*\*\/)?\s*;/g;
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

// Groups by what the value resolves to - the name misleads (`edge-stroke-width`
// is a length, `snackbar-success-border` is a color), so follow it to the literal.
const LITERAL_COLOR_RE = /^(#|rgb|hsl|oklch|color-mix|linear-gradient|radial-gradient|transparent\b|currentColor\b)/i;

const tokenValues = readTokenValues();

function readTokenValues() {
  const values = new Map();
  const tokenDistribution = path.resolve(repoRoot, 'packages/tokens/dist');
  if (!existsSync(tokenDistribution)) return values;
  for (const file of globSync('*.css', { cwd: tokenDistribution })) {
    const css = readFileSync(path.resolve(tokenDistribution, file), 'utf8');
    for (const [, name, value] of css.matchAll(/(--wb-ds-[\w-]+)\s*:\s*([^;]+);/g)) {
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
      props = [
        ...collectVariantProps(component.propsType, project, byId, warnings, component.slug, context).values(),
      ].sort((a, b) => a.name.localeCompare(b.name));
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
      cssVariables: extractCssVariables(component.dir, component.cssSources, warnings, component.slug),
    };
  }

  const linked = collectLinkedTypes(byId, warnings);
  const typeNames = linked.map((node) => node.name).sort();
  const categories = [...new Set(linked.map((node) => categoryOf(node)).filter(Boolean))].sort();

  await mkdir(path.dirname(componentsDataFile), { recursive: true });
  await writeFile(componentsDataFile, JSON.stringify(out, null, 2) + '\n');
  await writeFile(
    uiApiReferenceEntryFile,
    `export type {\n${typeNames.map((name) => `  ${name},\n`).join('')}} from '${UI_BARREL_IMPORT}';\n`,
  );
  await writeFile(uiApiReferenceCategoriesFile, JSON.stringify(categories, null, 2) + '\n');

  const summary = Object.entries(out).map(
    ([slug, entry]) => `${slug}: ${entry.props.length} props, ${entry.cssVariables.length} vars`,
  );
  console.log('✔ ui-api.json generated\n  ' + summary.join('\n  '));

  if (warnings.length > 0) {
    // An unresolved type would silently ship a "no configurable props" page.
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
