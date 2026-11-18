import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { PACKAGES_ROOT } from '../src/paths.js';
import type { ExternalTupleValues, LiteralValue } from '../src/symbols/const-tuples.js';

function workspacePackages() {
  const directories = new Map<string, string>();
  for (const entry of readdirSync(PACKAGES_ROOT, { withFileTypes: true })) {
    const manifest = path.join(PACKAGES_ROOT, entry.name, 'package.json');
    if (!entry.isDirectory() || !existsSync(manifest)) continue;
    const { name } = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string };
    if (name) directories.set(name, path.dirname(manifest));
  }
  return directories;
}

function literalOf(type: ts.Type): LiteralValue | undefined {
  if (type.isStringLiteral() || type.isNumberLiteral()) return type.value;
  if (type.flags & ts.TypeFlags.BooleanLiteral)
    return (type as ts.Type & { intrinsicName: string }).intrinsicName === 'true';
}

function tupleValues(file: string, name: string) {
  // One file without its imports: a tuple built from local constants still resolves, one built from imports does not.
  const program = ts.createProgram([file], { noEmit: true, noResolve: true, skipLibCheck: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  for (const statement of source?.statements ?? []) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
      const type = checker.getTypeAtLocation(declaration.name);
      if (!checker.isTupleType(type)) return;
      const values = checker.getTypeArguments(type as ts.TypeReference).map((element) => literalOf(element));
      return values.every((value) => value !== undefined) ? (values as LiteralValue[]) : undefined;
    }
  }
}

// Reads the tuple from the declaring file in its workspace package, the way TypeDoc names it in the target.
export function createTupleValueReader(): ExternalTupleValues {
  const directories = workspacePackages();
  const cache = new Map<string, readonly LiteralValue[] | undefined>();
  return ({ packageName, packagePath, qualifiedName }) => {
    const directory = directories.get(packageName);
    if (!directory || qualifiedName.includes('.')) return;
    const key = `${packageName}/${packagePath}::${qualifiedName}`;
    if (!cache.has(key)) {
      const file = path.join(directory, packagePath);
      cache.set(key, existsSync(file) ? tupleValues(file, qualifiedName) : undefined);
    }
    return cache.get(key);
  };
}
