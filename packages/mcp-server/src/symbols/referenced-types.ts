import type { TypedocExternalTarget, TypedocReflection, TypedocType } from './typedoc-types.js';

// Reflection ids restart at 0 in every TypeDoc run; the offset keeps a merged second run from colliding with the first.
export const ID_OFFSET = 1_000_000;

function walk(node: unknown, visit: (object: Record<string, unknown>) => void) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const object = node as Record<string, unknown>;
  visit(object);
  for (const [key, value] of Object.entries(object)) {
    if (key !== 'symbolIdMap') walk(value, visit);
  }
}

// Types the package declares but does not export: TypeDoc leaves them as name-only references.
export function unresolvedTargets(project: TypedocReflection): Required<TypedocExternalTarget>[] {
  const own = project.packageName;
  const found = new Map<string, Required<TypedocExternalTarget>>();
  walk(project, (object) => {
    const target = object.target as TypedocExternalTarget | undefined;
    if (object.type !== 'reference' || object.refersToTypeParameter || !target || typeof target !== 'object') return;
    const { packageName, packagePath, qualifiedName } = target;
    if (!own || packageName !== own || !packagePath || !qualifiedName) return;
    found.set(`${packagePath}::${qualifiedName}`, { packageName, packagePath, qualifiedName });
  });
  return [...found.values()];
}

export function referenceTypesIn(node: unknown) {
  const found: TypedocType[] = [];
  walk(node, (object) => {
    if (object.type === 'reference') found.push(object as unknown as TypedocType);
  });
  return found;
}

export function offsetReflectionIds(project: TypedocReflection) {
  walk(project, (object) => {
    if (typeof object.id === 'number') object.id += ID_OFFSET;
    if (typeof object.target === 'number' && object.target >= 0) object.target += ID_OFFSET;
  });
  return project;
}

function stripExtension(file: string) {
  return file.replace(/\.[cm]?[jt]sx?$/, '');
}

export function moduleMatches(moduleName: string, packagePath: string) {
  return moduleName === '' || `/${stripExtension(packagePath)}`.endsWith(`/${moduleName}`);
}
