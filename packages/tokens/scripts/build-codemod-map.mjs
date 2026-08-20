/**
 * Generates codemod-map.json from the designer migration changelog
 * (migration/2026-06-15-ds2-migration-map.md).
 *
 * Parses the rename tables (section 7) and the removed/rebuilt tables
 * (sections 8.1 and 8.3) and emits, for every pair, both the Figma names and
 * the CSS custom-property names the codemod operates on:
 *   old  `wb/txt-primary-default`  -> oldCss  `--ax-txt-primary-default`
 *   new  `wb/ui/text/default`      -> newCss  `--wb-ui-text-default`
 * (The legacy export prefixed variables with `ax/`; the map's OLD column
 * writes them under `wb/`. Only the segment after the prefix matters.)
 *
 * The parser never guesses: only code spans shaped like a concrete token
 * path (`wb/…`, no globs) count as names. A row whose replacement cell stays
 * ambiguous after that filter lands in `unparsed` — unless a human resolved
 * it in RESOLVED_BY_HAND below, which is the explicit, reviewable place for
 * judgment calls the changelog prose requires.
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

/**
 * Rows whose replacement cell mixes prose with more than one candidate —
 * resolved by a human against the changelog text instead of a heuristic.
 * Keyed by the OLD Figma name; `valueChanged` mirrors the row's ⚠ where set.
 */
const RESOLVED_BY_HAND = {
  // §8.3: typo-duplicate of txt-error-default, "merged into wb/ui/text/critical-default";
  // the row names both spellings ("same token under either spelling").
  'wb/txt-destuctive-default': { replacement: 'wb/ui/text/critical-default' },
  'wb/txt-destructive-default': { replacement: 'wb/ui/text/critical-default' },
  // §8.3: interim 2.0 name, never present in the legacy export — merged into icon/default.
  'wb/ui/icon/onsurface-default': { replacement: 'wb/ui/icon/default' },
  // §8.3: "literal colors; use wb/ui/icon/default / onaccent".
  'wb/icon-black': { replacement: 'wb/ui/icon/default' },
  'wb/icon-white': {
    replacement: 'wb/ui/icon/onaccent-default',
    note: 'onaccent icon token — verify the exact name against the 2.0 export',
  },
};

const ELLIPSIS = /\{(?:…|\.\.\.)\}/;

/** A concrete token path: `wb/…`, no glob stars. Filters out Figma IDs,
 * suffix shorthands, and `--wb-…` codeSyntax mentions inside notes. */
const isTokenPath = (span) => /^wb\/[^*]+$/.test(span);

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
 * Expands the OLD cell's code spans. A span that starts with an ellipsis
 * (`…-hover`) inherits its stem from the previous span in the same cell;
 * anything that is neither a token path nor an ellipsis (e.g. a Figma ID
 * mentioned in a note) is dropped.
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
    if (!isTokenPath(span)) continue;
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

function cells(row) {
  return row
    .replace(/^\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const codeSpans = (text) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

/** Italic notes, whichever emphasis marker the document carries. */
const noteOf = (text) => {
  const italics = [...text.matchAll(/[*_]\(([^)]+)\)[*_]/g)].map((match) => match[1]);
  return italics.length > 0 ? italics.join('; ') : undefined;
};

/**
 * A row-level ⚠ with a note naming specific states (e.g. "pressed: brand
 * #3969FF") applies only to those expanded names; without such a note it
 * applies to every name from the row.
 */
function valueChangedFor(name, rowFlag, note, braceList) {
  if (!rowFlag) return false;
  if (!note || !braceList) return true;
  const mentioned = braceList.filter((state) => new RegExp(`\\b${state}\\b`).test(note));
  if (mentioned.length === 0) return true;
  return mentioned.some((state) => name.endsWith(`-${state}`) || name.endsWith(`/${state}`));
}

function renameEntry(oldName, target, { rowFlag, note, braceList }) {
  return {
    old: oldName,
    new: target,
    oldCss: oldCss(oldName),
    newCss: newCss(target),
    ...(valueChangedFor(oldName, rowFlag, note, braceList) && { valueChanged: true }),
    ...(note && { note }),
  };
}

function removedEntry(oldName, replacement, { rowFlag, note, braceList, rebuilt, extra = {} }) {
  return {
    old: oldName,
    replacement,
    oldCss: oldCss(oldName),
    replacementCss: replacement === null ? null : newCss(replacement),
    ...(rebuilt && { rebuilt }),
    ...(valueChangedFor(oldName, rowFlag, note, braceList) && { valueChanged: true }),
    ...(note && { note }),
    ...extra,
  };
}

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

  const fullBrace = oldCell.match(/\{([^}…]+)\}/);
  if (fullBrace && fullBrace[1].includes(',')) {
    lastBraceList = fullBrace[1].split(',').map((part) => part.trim());
  }
  const braceList = lastBraceList;

  const oldNames = expandOldCell(codeSpans(oldCell), braceList);
  const rowFlag = line.includes('⚠');
  const note = noteOf(line) ?? noteOf(oldCell);

  if (oldNames.length === 0) {
    unparsed.push({ section, row: line.trim() });
    continue;
  }

  const newSpansAll = codeSpans(newCell);
  const candidates = newSpansAll.filter((span) => isTokenPath(span)).flatMap((span) => expandName(span, braceList));

  const isRemovedRow = /\*\*removed\*\*/i.test(newCell) || /\(none/i.test(newCell) || inRemoved === true;

  if (inRenames && !isRemovedRow) {
    if (candidates.length === oldNames.length) {
      for (const [position, oldName] of oldNames.entries()) {
        renames.push(renameEntry(oldName, candidates[position], { rowFlag, note, braceList }));
      }
    } else if (candidates.length > 0 && newSpansAll.filter((span) => isTokenPath(span)).length === 1) {
      // One token expression in the cell (extra spans were note mentions);
      // a single unexpanded target maps every OLD name onto it.
      for (const oldName of oldNames) {
        renames.push(renameEntry(oldName, candidates[0], { rowFlag, note, braceList }));
      }
    } else {
      unparsed.push({ section, row: line.trim() });
    }
    continue;
  }

  // Removed rows (8.1 rebuilt, 8.3 removals, and `**removed**` rows in 7.7).
  const rebuilt = section === '8.1';
  const context = { rowFlag, note, braceList, rebuilt };

  const handResolved = oldNames.every((name) => RESOLVED_BY_HAND[name]);
  if (handResolved) {
    for (const oldName of oldNames) {
      const resolution = RESOLVED_BY_HAND[oldName];
      removed.push(
        removedEntry(oldName, resolution.replacement, {
          ...context,
          extra: { resolvedByHand: true, ...(resolution.note && { note: resolution.note }) },
        }),
      );
    }
  } else if (candidates.length === oldNames.length && candidates.length > 0) {
    for (const [position, oldName] of oldNames.entries()) {
      removed.push(removedEntry(oldName, candidates[position], context));
    }
  } else if (candidates.length === 1 && newSpansAll.length === 1) {
    // A clean consolidation: many OLD names, exactly one token span and
    // nothing else in the cell (e.g. button-*-disabled → solid/disabled).
    for (const oldName of oldNames) {
      removed.push(removedEntry(oldName, candidates[0], context));
    }
  } else if (candidates.length === 0) {
    for (const oldName of oldNames) {
      removed.push(removedEntry(oldName, null, context));
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
  manual: [
    {
      pattern: '--ax-chips-*',
      reason: 'Chips rebuilt as a 4-token factory (map §8.2/§9.3) — chip coloring is rebuilt in the Chips task.',
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
  `codemod-map.json: ${dedupedRenames.length} renames, ${dedupedRemoved.length} removed ` +
    `(${dedupedRemoved.filter((entry) => entry.replacement === null).length} without a replacement, ` +
    `${dedupedRemoved.filter((entry) => entry.resolvedByHand).length} resolved by hand), ` +
    `${unparsed.length} unparsed rows.`,
);
if (unparsed.length > 0) {
  console.log('unparsed rows (resolve in RESOLVED_BY_HAND or fix the parser):');
  for (const entry of unparsed) console.log(`  [${entry.section}] ${entry.row}`);
  process.exitCode = 1;
}
