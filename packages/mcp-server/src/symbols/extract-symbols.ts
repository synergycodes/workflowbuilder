import { BASE, SITE } from '../config/site.js';
import {
  ID_OFFSET,
  moduleMatches,
  offsetReflectionIds,
  referenceTypesIn,
  unresolvedTargets,
} from './referenced-types.js';
import { declarationSignature, memberToString, typeToString } from './type-printer.js';
import {
  ReflectionKind,
  type TypedocComment,
  type TypedocCommentPart,
  type TypedocReflection,
  type TypedocType,
  inSourceOrder,
} from './typedoc-types.js';

type SymbolKind = 'class' | 'function' | 'interface' | 'type' | 'const' | 'enum';
type MemberKind = 'property' | 'method';

export interface ApiMember {
  id: string;
  name: string;
  kind: MemberKind;
  package: string;
  parent: string;
  importPath: string;
  signature: string;
  description: string;
  summary: string;
  defaultValue?: string;
  deprecated?: string;
}

interface ApiVariant {
  // The referenced type's name when the variant is a named type.
  name?: string;
  members: ApiMember[];
}

export interface ApiSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  package: string;
  importPath: string;
  otherImportPaths?: string[];
  typeOnly: boolean;
  signature: string;
  description: string;
  summary: string;
  category?: string;
  deprecated?: string;
  since?: string;
  defaultValue?: string;
  source: string;
  url?: string;
  docs?: string[];
  // false for a type the package declares but does not export; it is reachable only by name.
  exported?: false;
  unionSize?: number;
  members: ApiMember[];
  // Present for a union of object types: members of every variant, in union order.
  variants?: ApiVariant[];
}

export interface ExtractInput {
  packageName: string;
  project: TypedocReflection;
  // A string when the project's children are declarations; a map (in priority order) when they are modules.
  importPath: string | Record<string, string>;
  // Second TypeDoc run over the files that declare the types the package references but does not export.
  referenced?: TypedocReflection;
}

interface ExtractOptions {
  docsBySymbolName?: ReadonlyMap<string, readonly string[]>;
}

const KIND_PRIORITY: number[] = [
  ReflectionKind.Class,
  ReflectionKind.Function,
  ReflectionKind.Variable,
  ReflectionKind.Enum,
  ReflectionKind.Interface,
  ReflectionKind.TypeAlias,
];

const KIND_LABEL = new Map<number, SymbolKind>([
  [ReflectionKind.Class, 'class'],
  [ReflectionKind.Function, 'function'],
  [ReflectionKind.Variable, 'const'],
  [ReflectionKind.Enum, 'enum'],
  [ReflectionKind.Interface, 'interface'],
  [ReflectionKind.TypeAlias, 'type'],
]);

const MEMBER_KINDS = new Set<number>([ReflectionKind.Property, ReflectionKind.Method, ReflectionKind.Accessor]);
const UTILITY_TYPES = new Set(['Omit', 'Pick', 'Partial', 'Required', 'Readonly']);
const MAX_MEMBER_DEPTH = 3;

function partsToText(parts: TypedocCommentPart[] | undefined) {
  return (parts ?? []).map((part) => part.text).join('');
}

function blockTagText(comment: TypedocComment | undefined, ...tags: string[]) {
  const found = comment?.blockTags?.find((block) => tags.includes(block.tag));
  return found ? partsToText(found.content).trim() : undefined;
}

function stripDefaultFences(value: string) {
  return value
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```$/, '')
    .replaceAll(/^`+|`+$/g, '')
    .trim();
}

function commentOf(declaration: TypedocReflection) {
  if (declaration.comment) return declaration.comment;
  const signature = declaration.signatures?.[0] ?? declaration.getSignature;
  return signature?.comment;
}

function describe(comment: TypedocComment | undefined) {
  if (!comment) return '';
  const summary = partsToText(comment.summary).trim();
  const remarks = blockTagText(comment, '@remarks');
  const example = blockTagText(comment, '@example');
  return [summary, remarks, example ? `Example:\n${example}` : undefined].filter(Boolean).join('\n\n');
}

export function firstSentence(description: string) {
  const paragraph = description.split(/\n\s*\n/)[0] ?? '';
  const flat = paragraph.replaceAll(/\s+/g, ' ').trim();
  const match = /^(.*?[.!?])(?=\s+[A-Z`]|$)/.exec(flat);
  return match ? match[1] : flat;
}

function defaultValueOf(comment: TypedocComment | undefined) {
  const raw = blockTagText(comment, '@default', '@defaultValue');
  const value = raw ? stripDefaultFences(raw) : undefined;
  return value || undefined;
}

function sourceOf(declaration: TypedocReflection) {
  const source = declaration.sources?.[0];
  if (!source) return 'unknown';
  // fileName is relative to TypeDoc's common root, which differs per package; the url keeps the repo path.
  const fromUrl = source.url ? /\/blob\/[^/]+\/(.+?)(?:#L\d+)?$/.exec(source.url)?.[1] : undefined;
  return `${fromUrl ?? source.fileName}:${source.line}`;
}

function flatten(node: TypedocReflection, byId: Map<number, TypedocReflection>) {
  byId.set(node.id, node);
  for (const child of node.children ?? []) flatten(child, byId);
}

function literalNames(type: TypedocType | undefined): string[] {
  if (!type) return [];
  if (type.type === 'literal' && typeof type.value === 'string') return [type.value];
  if (type.type === 'union') return (type.types ?? []).flatMap((member) => literalNames(member));
  return [];
}

interface MemberVariant {
  name?: string;
  members: Map<string, TypedocReflection>;
}

const MAX_VARIANTS = 32;

class MemberCollector {
  constructor(
    private readonly byId: Map<number, TypedocReflection>,
    private readonly referencedModules: readonly TypedocReflection[],
  ) {}

  collect(declaration: TypedocReflection) {
    const out = new Map<string, TypedocReflection>();
    this.fromDeclaration(declaration, new Set(), 0, out);
    return sourceOrdered(out);
  }

  // Empty unless the alias is a union with at least two variants that have members.
  variants(declaration: TypedocReflection) {
    if (declaration.kind !== ReflectionKind.TypeAlias) return [];
    const found = this.variantsOfType(declaration.type, new Set([declaration.id]))
      .filter((variant) => variant.members.size > 0)
      .map((variant) => ({ ...variant, members: sourceOrdered(variant.members) }));
    return found.length >= 2 ? found : [];
  }

  declarationOf(type: TypedocType): TypedocReflection | undefined {
    const { target } = type;
    if (typeof target === 'number') return this.resolve(this.byId.get(target));
    if (!target?.qualifiedName || !target.packagePath) return undefined;
    const { qualifiedName, packagePath } = target;
    for (const module of this.referencedModules) {
      if (!moduleMatches(module.name, packagePath)) continue;
      const found = module.children?.find((child) => child.name === qualifiedName);
      if (found) return this.resolve(found);
    }
    return undefined;
  }

  private resolve(target: TypedocReflection | undefined): TypedocReflection | undefined {
    if (target?.kind === ReflectionKind.Reference && target.target !== undefined) {
      return this.byId.get(target.target);
    }
    return target;
  }

  private variantsOfType(type: TypedocType | undefined, seen: Set<number>): MemberVariant[] {
    if (!type) return [];
    if (type.type === 'union') return (type.types ?? []).flatMap((member) => this.variantsOfType(member, seen));
    if (type.type === 'intersection') {
      let product: MemberVariant[] = [{ members: new Map() }];
      for (const part of type.types ?? []) {
        const options = this.variantsOfType(part, seen);
        if (options.length === 0) continue;
        if (product.length * options.length > MAX_VARIANTS) return [this.leaf(type, seen)];
        product = product.flatMap((base) =>
          options.map((option) => ({
            name: [base.name, option.name].filter(Boolean).join(' & ') || undefined,
            members: new Map([...option.members, ...base.members]),
          })),
        );
      }
      return product;
    }
    if (type.type === 'reference' && !UTILITY_TYPES.has(type.name ?? '')) {
      const target = this.declarationOf(type);
      if (target?.kind === ReflectionKind.TypeAlias && !seen.has(target.id) && isCompound(target.type)) {
        const inner = this.variantsOfType(target.type, new Set(seen).add(target.id));
        return inner.map((variant) => ({ ...variant, name: variant.name ?? type.name }));
      }
    }
    return [this.leaf(type, seen)];
  }

  private leaf(type: TypedocType, seen: Set<number>): MemberVariant {
    const members = new Map<string, TypedocReflection>();
    this.fromType(type, new Set(seen), 0, members);
    const named = type.type === 'reference' && type.name && !UTILITY_TYPES.has(type.name);
    return { ...(named ? { name: type.name } : {}), members };
  }

  private add(out: Map<string, TypedocReflection>, child: TypedocReflection) {
    if (!MEMBER_KINDS.has(child.kind) || out.has(child.name)) return;
    const inherited = child.inheritedFrom as { target?: unknown } | undefined;
    if (inherited && typeof inherited.target !== 'number') return;
    if (inherited && typeof inherited.target === 'number' && inherited.target < 0) return;
    out.set(child.name, child);
  }

  private fromDeclaration(
    declaration: TypedocReflection,
    seen: Set<number>,
    depth: number,
    out: Map<string, TypedocReflection>,
  ) {
    if (seen.has(declaration.id) || depth > MAX_MEMBER_DEPTH) return;
    seen.add(declaration.id);
    if (declaration.kind === ReflectionKind.Interface || declaration.kind === ReflectionKind.Class) {
      for (const child of declaration.children ?? []) this.add(out, child);
    } else if (declaration.kind === ReflectionKind.TypeAlias) {
      for (const child of declaration.children ?? []) this.add(out, child);
      this.fromType(declaration.type, seen, depth, out);
    }
  }

  private fromType(
    type: TypedocType | undefined,
    seen: Set<number>,
    depth: number,
    out: Map<string, TypedocReflection>,
  ) {
    if (!type) return;
    switch (type.type) {
      case 'intersection':
      case 'union': {
        for (const member of type.types ?? []) this.fromType(member, seen, depth, out);
        return;
      }
      case 'reflection': {
        for (const child of type.declaration?.children ?? []) this.add(out, child);
        return;
      }
      case 'reference': {
        this.fromReference(type, seen, depth, out);
        return;
      }
    }
  }

  private fromReference(type: TypedocType, seen: Set<number>, depth: number, out: Map<string, TypedocReflection>) {
    const typeArguments = type.typeArguments ?? [];
    if (type.name && UTILITY_TYPES.has(type.name) && typeArguments.length > 0) {
      const source = new Map<string, TypedocReflection>();
      this.fromType(typeArguments[0], seen, depth, source);
      const listed = new Set(literalNames(typeArguments[1]));
      for (const [name, member] of source) {
        const keep = type.name === 'Pick' ? listed.has(name) : type.name === 'Omit' ? !listed.has(name) : true;
        if (!keep || out.has(name)) continue;
        out.set(name, withUtilityFlags(type.name, member));
      }
      return;
    }
    const target = this.declarationOf(type);
    if (
      target &&
      (target.kind === ReflectionKind.TypeAlias ||
        target.kind === ReflectionKind.Interface ||
        target.kind === ReflectionKind.Class)
    ) {
      this.fromDeclaration(target, seen, depth + 1, out);
    }
    for (const argument of typeArguments) {
      if (argument.type === 'reflection') this.fromType(argument, seen, depth, out);
    }
  }
}

function withUtilityFlags(utility: string, member: TypedocReflection): TypedocReflection {
  if (utility === 'Partial') return { ...member, flags: { ...member.flags, isOptional: true } };
  if (utility === 'Required') return { ...member, flags: { ...member.flags, isOptional: false } };
  if (utility === 'Readonly') return { ...member, flags: { ...member.flags, isReadonly: true } };
  return member;
}

function unionTypes(type: TypedocType | undefined): TypedocType[] {
  if (!type) return [];
  return type.type === 'union' ? (type.types ?? []).flatMap((member) => unionTypes(member)) : [type];
}

// One member per name across all variants: the union of the variants' types, optional if optional in any.
function mergeVariantMembers(variants: readonly MemberVariant[]) {
  const byName = new Map<string, TypedocReflection[]>();
  for (const variant of variants) {
    for (const [name, member] of variant.members) byName.set(name, [...(byName.get(name) ?? []), member]);
  }
  const merged = new Map<string, TypedocReflection>();
  for (const [name, members] of byName) {
    const [first] = members;
    if (members.length === 1 || members.some((member) => member.type === undefined || member.signatures?.length)) {
      merged.set(name, first);
      continue;
    }
    const seen = new Set<string>();
    const types = members
      .flatMap((member) => unionTypes(member.type))
      .filter((type) => {
        const key = typeToString(type);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const pool = types.filter((type) => !(type.type === 'intrinsic' && type.name === 'never'));
    const concrete = pool.length > 0 ? pool : types;
    const ordered = [
      ...concrete.filter((type) => !(type.type === 'intrinsic' && type.name === 'undefined')),
      ...concrete.filter((type) => type.type === 'intrinsic' && type.name === 'undefined'),
    ];
    merged.set(name, {
      ...first,
      flags: { ...first.flags, isOptional: members.some((member) => member.flags?.isOptional === true) },
      type: ordered.length === 1 ? ordered[0] : { type: 'union', types: ordered },
    });
  }
  return merged;
}

function sourceOrdered(members: Map<string, TypedocReflection>) {
  return new Map(inSourceOrder([...members.values()]).map((member) => [member.name, member]));
}

function isCompound(type: TypedocType | undefined) {
  return type?.type === 'union' || type?.type === 'intersection';
}

interface ExportGroup {
  declarations: Map<number, TypedocReflection>;
  importPaths: string[];
}

function collectExports(input: ExtractInput, byId: Map<number, TypedocReflection>) {
  const groups = new Map<string, ExportGroup>();
  const addExport = (child: TypedocReflection, importPath: string) => {
    const declaration =
      child.kind === ReflectionKind.Reference && child.target !== undefined ? byId.get(child.target) : child;
    if (!declaration || !KIND_PRIORITY.includes(declaration.kind)) return;
    const group: ExportGroup = groups.get(child.name) ?? { declarations: new Map(), importPaths: [] };
    group.declarations.set(declaration.id, declaration);
    if (!group.importPaths.includes(importPath)) group.importPaths.push(importPath);
    groups.set(child.name, group);
  };

  if (typeof input.importPath === 'string') {
    for (const child of input.project.children ?? []) addExport(child, input.importPath);
  } else {
    const modulePaths = input.importPath;
    const modules = [...(input.project.children ?? [])].sort(
      (a, b) => Object.keys(modulePaths).indexOf(a.name) - Object.keys(modulePaths).indexOf(b.name),
    );
    for (const module of modules) {
      const importPath = modulePaths[module.name];
      if (!importPath) continue;
      for (const child of module.children ?? []) addExport(child, importPath);
    }
  }
  return groups;
}

function sortByPriority(declarations: Iterable<TypedocReflection>) {
  return [...declarations].sort((a, b) => KIND_PRIORITY.indexOf(a.kind) - KIND_PRIORITY.indexOf(b.kind));
}

// A run over a single file has no module level: its declarations are the project's children.
function modulesOf(project: TypedocReflection) {
  const children = project.children ?? [];
  return children.length > 0 && children.every((child) => child.kind === ReflectionKind.Module)
    ? children
    : [{ ...project, name: '' }];
}

function unionSizeOf(declaration: TypedocReflection) {
  const type = declaration.kind === ReflectionKind.TypeAlias ? declaration.type : undefined;
  return type?.type === 'union' && (type.types?.length ?? 0) > 1 ? type.types?.length : undefined;
}

// Hops from an exported symbol to the unexported types its signatures name, transitively.
const MAX_REFERENCE_HOPS = 3;

function referencedDeclarations(input: ExtractInput, collector: MemberCollector, exportedNames: ReadonlySet<string>) {
  if (!input.referenced) return [];
  const found = new Map<number, TypedocReflection>();
  let frontier: TypedocType[] = unresolvedTargets(input.project).map((target) => ({ type: 'reference', target }));
  for (let hop = 0; hop < MAX_REFERENCE_HOPS && frontier.length > 0; hop++) {
    const next: TypedocReflection[] = [];
    for (const reference of frontier) {
      const declaration = collector.declarationOf(reference);
      if (
        !declaration ||
        declaration.id < ID_OFFSET ||
        found.has(declaration.id) ||
        exportedNames.has(declaration.name) ||
        !KIND_PRIORITY.includes(declaration.kind)
      ) {
        continue;
      }
      found.set(declaration.id, declaration);
      next.push(declaration);
    }
    frontier = next.flatMap((declaration) => referenceTypesIn(declaration));
  }
  return [...found.values()];
}

export function extractSymbols(input: ExtractInput, options: ExtractOptions = {}): ApiSymbol[] {
  const byId = new Map<number, TypedocReflection>();
  flatten(input.project, byId);
  const referenced = input.referenced ? offsetReflectionIds(input.referenced) : undefined;
  if (referenced) flatten(referenced, byId);
  const collector = new MemberCollector(byId, referenced ? modulesOf(referenced) : []);
  const fallbackImportPath =
    typeof input.importPath === 'string' ? input.importPath : (Object.values(input.importPath)[0] ?? '');

  const buildSymbol = (name: string, group: ExportGroup, exported: boolean): ApiSymbol => {
    const declarations = sortByPriority(group.declarations.values());
    const primary = declarations[0];
    const comments = declarations.map((declaration) => commentOf(declaration));
    const comment = comments.find((candidate) => candidate !== undefined);
    const description = describe(comment);
    const category =
      blockTagText(comment, '@category') ?? comments.map((item) => blockTagText(item, '@category')).find(Boolean);
    const id = `${input.packageName}:${name}`;
    const [importPath, ...otherImportPaths] = group.importPaths;

    const toMember = (memberName: string, child: TypedocReflection): ApiMember => {
      const memberComment = commentOf(child);
      const memberDescription = describe(memberComment);
      const deprecated = blockTagText(memberComment, '@deprecated');
      return {
        id: `${id}.${memberName}`,
        name: memberName,
        kind: child.kind === ReflectionKind.Method ? 'method' : 'property',
        package: input.packageName,
        parent: name,
        importPath,
        signature: memberToString(child),
        description: memberDescription,
        summary: firstSentence(memberDescription),
        ...(defaultValueOf(memberComment) ? { defaultValue: defaultValueOf(memberComment) } : {}),
        ...(deprecated === undefined ? {} : { deprecated }),
      };
    };

    const members = new Map<string, ApiMember>();
    for (const declaration of declarations) {
      for (const [memberName, child] of collector.collect(declaration)) {
        if (!members.has(memberName)) members.set(memberName, toMember(memberName, child));
      }
    }
    const rawVariants = collector.variants(primary);
    for (const [memberName, child] of mergeVariantMembers(rawVariants)) {
      if (members.has(memberName)) members.set(memberName, toMember(memberName, child));
    }
    const variants = rawVariants.map((variant) => ({
      ...(variant.name ? { name: variant.name } : {}),
      members: [...variant.members].map(([memberName, child]) => toMember(memberName, child)),
    }));
    const unionSize = unionSizeOf(primary);

    const deprecated = blockTagText(comment, '@deprecated');
    const since = blockTagText(comment, '@since');
    const defaultValue = defaultValueOf(comment);
    const docs = options.docsBySymbolName?.get(name);
    const documented = input.packageName === 'sdk' && category !== undefined && comment !== undefined;

    return {
      id,
      name,
      kind: KIND_LABEL.get(primary.kind) ?? 'type',
      package: input.packageName,
      importPath,
      ...(otherImportPaths.length > 0 ? { otherImportPaths } : {}),
      typeOnly: declarations.every(
        (declaration) => declaration.kind === ReflectionKind.Interface || declaration.kind === ReflectionKind.TypeAlias,
      ),
      signature: declarations.map((declaration) => declarationSignature(declaration)).join('\n'),
      description,
      summary: firstSentence(description),
      ...(category ? { category } : {}),
      ...(deprecated === undefined ? {} : { deprecated }),
      ...(since === undefined ? {} : { since }),
      ...(defaultValue ? { defaultValue } : {}),
      source: sourceOf(primary),
      ...(documented ? { url: `${SITE}${BASE}/api/${category.toLowerCase()}/${name.toLowerCase()}/` } : {}),
      ...(docs && docs.length > 0 ? { docs: [...docs] } : {}),
      ...(exported ? {} : { exported: false as const }),
      ...(unionSize ? { unionSize } : {}),
      members: [...members.values()],
      ...(variants.length > 0 ? { variants } : {}),
    };
  };

  const groups = collectExports(input, byId);
  const symbols = [...groups].map(([name, group]) => buildSymbol(name, group, true));
  const taken = new Set(symbols.map((symbol) => symbol.id));
  for (const declaration of referencedDeclarations(input, collector, new Set(groups.keys()))) {
    if (taken.has(`${input.packageName}:${declaration.name}`)) continue;
    taken.add(`${input.packageName}:${declaration.name}`);
    const group: ExportGroup = {
      declarations: new Map([[declaration.id, declaration]]),
      importPaths: [fallbackImportPath],
    };
    symbols.push(buildSymbol(declaration.name, group, false));
  }

  return symbols.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
