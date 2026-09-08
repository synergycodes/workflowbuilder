// Guards the air-gap boundary of deploy/ai-studio/Dockerfile: every RUN after
// `pnpm fetch` must carry --network=none, so BuildKit blocks egress from installs,
// lifecycle scripts and build commands alike. `--offline` alone only stops pnpm's
// own resolver. After the boundary, `ADD <url>` and `COPY --from=<image>` are rejected
// too (downloads no RUN flag governs), as is a `# syntax=` directive anywhere: it would
// pull the build frontend from Docker Hub unpinned. Run with `pnpm check:offline-build`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCKERFILE = 'deploy/ai-studio/Dockerfile';
// The boundary step must be exactly `pnpm fetch`: anything chained onto it runs with network.
const NETWORK_BOUNDARY = /^RUN(?:\s+--\S+)*\s+pnpm fetch$/i;

// Dockerfile instructions span continuation lines (trailing `\`) and may hold
// comment lines in between; both are folded into one instruction here.
function parseInstructions(text) {
  const instructions = [];
  let current = null;
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    // An even run of trailing backslashes is literal, not a continuation.
    const continues = /(^|[^\\])(\\\\)*\\$/.test(line);
    const content = continues ? line.slice(0, -1).trim() : line;
    if (current) {
      current.text += ' ' + content;
    } else {
      current = { line: index + 1, text: content };
    }
    if (!continues) {
      instructions.push(current);
      current = null;
    }
  });
  if (current) instructions.push(current);
  return instructions;
}

const dockerfile = readFileSync(path.join(ROOT, DOCKERFILE), 'utf8');

if (/^#\s*syntax\s*=/im.test(dockerfile)) {
  console.error(`${DOCKERFILE}: remove the \`# syntax=\` directive; it downloads the build frontend from Docker Hub.`);
  process.exit(1);
}

const instructions = parseInstructions(dockerfile);
const isRun = ({ text }) => /^RUN\b/i.test(text);

const boundary = instructions.findIndex(({ text }) => NETWORK_BOUNDARY.test(text));
if (boundary === -1) {
  const chained = instructions.find(({ text }) => /\bpnpm fetch\b/.test(text));
  console.error(
    chained
      ? `${DOCKERFILE}: line ${chained.line}: the \`pnpm fetch\` step must run nothing else; chained commands keep network access.`
      : `${DOCKERFILE}: no \`pnpm fetch\` step found; cannot locate the network boundary.`,
  );
  process.exit(1);
}

// Only the instruction's own flags count; the token inside a shell command means nothing to BuildKit.
const instructionFlags = (text) => /^[A-Z]+((?:\s+--\S+)*)/i.exec(text)[1].trim().split(/\s+/).filter(Boolean);
const isolated = (text) => {
  const network = instructionFlags(text).filter((flag) => flag.startsWith('--network='));
  return network.length > 0 && network.every((flag) => flag === '--network=none');
};

// `COPY --from` may name a stage (or its index); anything else is an image to pull.
const stages = new Set(
  instructions
    .map(({ text }) => /^FROM(?:\s+--\S+)*\s+\S+\s+AS\s+(\S+)/i.exec(text)?.[1].toLowerCase())
    .filter(Boolean),
);
const reachesNetwork = ({ text }) => {
  if (isRun({ text })) return !isolated(text);
  if (/^ADD\b/i.test(text)) return /(^|\s)(?:[a-z]+:\/\/|git@)/i.test(text.replace(/^ADD/i, ''));
  if (/^COPY\b/i.test(text)) {
    const from = instructionFlags(text)
      .find((flag) => flag.startsWith('--from='))
      ?.slice('--from='.length);
    return from !== undefined && !/^\d+$/.test(from) && !stages.has(from.toLowerCase());
  }
  return false;
};
const leaking = instructions.slice(boundary + 1).filter(reachesNetwork);

if (leaking.length > 0) {
  console.error(
    `${DOCKERFILE}: steps after \`pnpm fetch\` that may reach the network (RUN without --network=none, ADD <url>, COPY --from=<image>):`,
  );
  for (const { line, text } of leaking) {
    console.error(`  line ${line}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);
  }
  process.exit(1);
}

const runsBefore = instructions.slice(0, boundary + 1).filter(isRun).length;
const runsAfter = instructions.slice(boundary + 1).filter(isRun).length;
console.log(
  `${DOCKERFILE}: ${runsAfter} post-fetch RUN steps are --network=none, no ADD <url> or COPY --from=<image> ` +
    `(${runsBefore} steps before the boundary may use the registry).`,
);
