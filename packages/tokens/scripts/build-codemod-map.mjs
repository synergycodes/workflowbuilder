/**
 * Generates codemod-map.json from the designer migration changelog
 * (migration/2026-06-15-ds2-migration-map.md).
 *
 * Parses the rename tables (section 7), the removed/rebuilt tables
 * (sections 8.1 and 8.3) and emits, for every pair, both the Figma names and
 * the CSS custom-property names the codemod operates on:
 *   old  `wb/txt-primary-default`  -> oldCss  `--ax-txt-primary-default`
 *   new  `wb/ui/text/default`      -> newCss  `--wb-ui-text-default`
 * (The legacy export prefixed variables with `ax/`; the map's OLD column
 * writes them under `wb/`. Only the segment after the prefix matters.)
 *
 * Anything the parser cannot resolve into an unambiguous 1:1 pair lands in
 * `unparsed` — loudly, so a map update never silently drops rows.
 *
 * Usage: node scripts/build-codemod-map.mjs [path-to-map.md]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const TOKENS_DIRECTORY = path.resolve(fileURLToPath(import.meta.url), '../..');
const MAP_PATH = process.argv[2] ?? path.join(TOKENS_DIRECTORY, 'migration/2026-06-15-ds2-migration-map.md');
const OUT_PATH = path.join(TOKENS_DIRECTORY, 'codemod-map.json');

const markdown = readFileSync(MAP_PATH, 'utf8');

const ELLIPSIS = /\{(?:…|\.\.\.)\}/;

/**
 * Expands `{a,b,c}` alternatives and `accN..M` ranges into concrete names.
 * `{…}` inherits `inheritedList` — the last fully-written brace list in the
 * current table (the map's convention: the first row spells the states out,
 * later rows abbreviate).
 */
function expandName(name, inheritedList) {
  const resolved = ELLIPSIS.test(name) && inheritedList ? name.replace(ELLIPSIS, `{${inheritedList.join(',')}}`) : name;
  const braceMatch = resolved.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (braceMatch) {
    return braceMatch[2]
      .split(',')
      .flatMap((part) => expandName(`${braceMatch[1]}${part.trim()}${braceMatch[3]}`, inheritedList));
  }
  const rangeMatch = resolved.match(/^(.*?)(\d+)\.\.(\d+)(.*)$/);
  if (rangeMatch) {
    const [, head, from, to, tail] = rangeMatch;
    const names = [];
    for (let index = Number(from); index <= Number(to); index += 1) {
      names.push(`${head}${index}${tail}`);
    }
    return names;
  }
  return [resolved];
}

/**
 * Expands every code span of an OLD cell. A span that starts with an
 * ellipsis (`…-hover`) inherits its stem from the previous span in the same
 * cell ('wb/dropdown-bg-destructive-default', '…-hover' → …-destructive-hover).
 */
function expandOldCell(spans, inheritedList) {
  const names = [];
  for (const [index, span] of spans.entries()) {
    if (/^(…|\.\.\.)/.test(span) && index > 0) {
      const tail = span.replace(/^(…|\.\.\.)/, '');
      const previous = spans[index - 1];
      names.push(previous.replace(/-[a-z0-9]+$/, '') + tail);
      continue;
    }
    names.push(...expandName(span, inheritedList));
  }
  return names;
}

function toCss(figmaName, prefix) {
  const withoutNamespace = figmaName.replace(/^wb\//, '');
  const kebab = withoutNamespace
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return `${prefix}${kebab}`;
}

const oldCss = (name) => toCss(name, '--ax-');
const newCss = (name) => toCss(name, '--wb-');

/** Splits a markdown table row into trimmed cells. */
function cells(row) {
  return row
    .replace(/^\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const codeSpans = (text) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

/** `{…}` / `..6` in the NEW column inherits the same expansion list as OLD. */
function resolveNewNames(newSpans, braceList) {
  const target = newSpans[0];
  if (target === undefined) return [];
  return expandName(target, braceList);
}
const noteOf = (text) => {
  const italics = [...text.matchAll(/\*\(([^)]+)\)\*/g)].map((match) => match[1]);
  return italics.length > 0 ? italics.join('; ') : undefined;
};

const lines = markdown.split('\n');
const renames = [];
const removed = [];
const unparsed = [];

let section = '';
let lastBraceList;
for (const line of lines) {
  const heading = line.match(/^#{2,3}\s+(\d+(?:\.\d+)?)/);
  if (heading) {
    section = heading[1];
    lastBraceList = undefined;
  }

  const inRenames = section.startsWith('7.');
  const inRemoved = section === '8.1' || section === '8.3';
  if (!inRenames && !inRemoved) continue;
  if (!line.startsWith('|') || /^\|\s*-+/.test(line) || /^\|\s*Old/i.test(line) || /^\|\s*Removed/i.test(line)) {
    continue;
  }

  const [oldCell, newCell] = cells(line);
  if (oldCell === undefined || newCell === undefined) continue;

  // A fully-written brace list becomes the inheritance context for `{…}`
  // rows below it in the same table.
  const fullBrace = oldCell.match(/\{([^}…]+)\}/);
  if (fullBrace && fullBrace[1].includes(',')) {
    lastBraceList = fullBrace[1].split(',').map((part) => part.trim());
  }
  const braceList = lastBraceList;

  const oldNames = expandOldCell(codeSpans(oldCell), braceList);
  const newSpans = codeSpans(newCell);
  const valueChanged = line.includes('⚠');
  const note = noteOf(line) ?? noteOf(oldCell);

  if (oldNames.length === 0) {
    unparsed.push({ section, row: line.trim() });
    continue;
  }

  const isRemovedRow = /\*\*removed\*\*/i.test(newCell) || /\(none/i.test(newCell) || inRemoved === true;

  if (inRenames && !isRemovedRow) {
    const newNames = resolveNewNames(newSpans, braceList);
    if (newNames.length === oldNames.length) {
      for (const [position, oldName] of oldNames.entries()) {
        renames.push({
          old: oldName,
          new: newNames[position],
          oldCss: oldCss(oldName),
          newCss: newCss(newNames[position]),
          ...(valueChanged && { valueChanged }),
          ...(note && { note }),
        });
      }
    } else if (newNames.length === 1) {
      for (const oldName of oldNames) {
        renames.push({
          old: oldName,
          new: newNames[0],
          oldCss: oldCss(oldName),
          newCss: newCss(newNames[0]),
          ...(valueChanged && { valueChanged }),
          ...(note && { note }),
        });
      }
    } else {
      unparsed.push({ section, row: line.trim() });
    }
    continue;
  }

  // Removed rows (8.1 rebuilt, 8.3 removals, and `**removed**` rows in 7.7).
  const replacementNames = resolveNewNames(newSpans, braceList);
  const rebuilt = section === '8.1';
  if (replacementNames.length === oldNames.length && replacementNames.length > 0) {
    for (const [position, oldName] of oldNames.entries()) {
      removed.push({
        old: oldName,
        replacement: replacementNames[position],
        oldCss: oldCss(oldName),
        replacementCss: newCss(replacementNames[position]),
        ...(rebuilt && { rebuilt }),
        ...(valueChanged && { valueChanged }),
        ...(note && { note }),
      });
    }
  } else if (replacementNames.length === 1) {
    for (const oldName of oldNames) {
      removed.push({
        old: oldName,
        replacement: replacementNames[0],
        oldCss: oldCss(oldName),
        replacementCss: newCss(replacementNames[0]),
        ...(rebuilt && { rebuilt }),
        ...(valueChanged && { valueChanged }),
        ...(note && { note }),
      });
    }
  } else if (replacementNames.length === 0) {
    for (const oldName of oldNames) {
      removed.push({
        old: oldName,
        replacement: null,
        oldCss: oldCss(oldName),
        replacementCss: null,
        ...(note && { note }),
      });
    }
  } else {
    unparsed.push({ section, row: line.trim() });
  }
}

// Some tokens appear both in a section-7 rename row (all states expanded) and
// in a section-8.3 removal row (state-specific consolidation) — the specific
// removal wins. Within `removed`, 7.7's inline `**removed**` rows repeat 8.3.
const removedByCss = new Map();
for (const entry of removed) {
  if (!removedByCss.has(entry.oldCss)) removedByCss.set(entry.oldCss, entry);
}
const dedupedRemoved = [...removedByCss.values()];
const dedupedRenames = renames.filter((entry) => !removedByCss.has(entry.oldCss));

const map = {
  $source: path.relative(TOKENS_DIRECTORY, MAP_PATH),
  $generatedBy: 'scripts/build-codemod-map.mjs',
  // Primitives keep their names 1:1 under the new namespace; validated
  // against the real 2.0 export by the manifest when it lands.
  prefixRules: [{ oldCssPrefix: '--ax-colors-', newCssPrefix: '--wb-colors-' }],
  // Not expressible as 1:1 renames — handled inside their component tasks:
  manual: [
    {
      pattern: '--ax-chips-*',
      reason:
        'Chips rebuilt as a 4-token factory (map §8.2/§9.3) — chip coloring is rebuilt in the Chips task.',
    },
    {
      pattern: '--ax-nav-button-bg-primary-hover',
      reason:
        'One legacy token served hover/pressed/focus states (map §10) — split per state in the Buttons task.',
    },
  ],
  renames: dedupedRenames,
  removed: dedupedRemoved,
  // Numerals (spacing/radius/stroke) have no rename rows in the designer map —
  // spacing migrated in Figma via bindings. Pairs are generated value→token
  // against the real 2.0 export in the pipeline-switch PR and appended here.
  dimensions: [],
  unparsed,
};

writeFileSync(OUT_PATH, `${JSON.stringify(map, null, 2)}\n`);
console.log(
  `codemod-map.json: ${dedupedRenames.length} renames, ${dedupedRemoved.length} removed, ${unparsed.length} unparsed rows.`,
);
if (unparsed.length > 0) {
  console.log('unparsed rows (resolve manually or fix the parser):');
  for (const entry of unparsed) console.log(`  [${entry.section}] ${entry.row}`);
}
