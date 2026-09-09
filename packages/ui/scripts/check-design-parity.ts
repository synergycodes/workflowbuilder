import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';

type Check = { name: string; node: string; figma: string; css: Array<[string, number]> };
type Expectations = { fileName: string; fileLastModified: string; nodes: Record<string, Record<string, unknown>> };

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '..');
const parityDirectory = path.join(directory, 'design-parity');
const expectations = JSON.parse(readFileSync(path.join(parityDirectory, 'expectations.json'), 'utf8')) as Expectations;
const checks = JSON.parse(readFileSync(path.join(parityDirectory, 'checks.json'), 'utf8')) as Check[];
const ROOT_FONT_SIZE = 16;
const TOLERANCE = 0.5;

const declarations = new Map<string, string>();
for (const file of ['dist/tokens.css', 'dist/index.css']) {
  const css = postcss.parse(readFileSync(path.join(root, file), 'utf8'));
  css.walkRules((rule) => {
    if (/dark/.test(rule.selector)) return;
    rule.walkDecls(/^--/, (declaration) => declarations.set(declaration.prop, declaration.value.trim()));
  });
}

function resolve(name: string, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`Circular custom property chain at ${name}`);
  seen.add(name);
  const value = declarations.get(name);
  if (value === undefined) throw new Error(`${name} is not declared in the built CSS`);
  const alias = /^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/.exec(value);
  if (!alias) return value;
  return declarations.has(alias[1]) || !alias[2] ? resolve(alias[1], seen) : alias[2].trim();
}

function toPx(value: string, name: string): number {
  const match = /^(-?\d*\.?\d+)(px|rem)?$/.exec(value);
  if (!match) throw new Error(`${name} resolves to "${value}", which is not a plain px/rem length`);
  return match[2] === 'rem' ? Number(match[1]) * ROOT_FONT_SIZE : Number(match[1]);
}

function figmaValue(node: Record<string, unknown>, figmaPath: string): number {
  const value = figmaPath.split('.').reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return current;
    return (current as Record<string, unknown>)[key];
  }, node);
  if (typeof value !== 'number') throw new Error(`Figma node has no numeric "${figmaPath}"`);
  return value;
}

let failures = 0;
console.log(`Design parity against Figma file "${expectations.fileName}" (modified ${expectations.fileLastModified})`);
for (const check of checks) {
  const node = expectations.nodes[check.node];
  try {
    const expected = figmaValue(node, check.figma);
    const actual = check.css.reduce((sum, [name, factor]) => sum + toPx(resolve(name), name) * factor, 0);
    const ok = Math.abs(actual - expected) <= TOLERANCE;
    if (!ok) failures += 1;
    const formula = check.css.map(([name, factor]) => (factor === 1 ? name : `${factor} * ${name}`)).join(' + ');
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.name}: figma ${expected}px, css ${actual}px  (${formula})`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${check.name}: ${(error as Error).message}`);
  }
}

if (failures > 0) {
  throw new Error(`${failures} design parity check(s) failed.`);
}
console.log(`\nAll ${checks.length} design parity checks passed.`);
