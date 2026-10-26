// Fails when a step after `pnpm fetch` in deploy/ai-studio/Dockerfile can reach the network.
// What counts and why: deploy/ai-studio/README.md, "Air-gapped / offline install".
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
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
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
  }
  if (current) instructions.push(current);
  return instructions;
}

const isRun = ({ text }) => /^RUN\b/i.test(text);

// Only the instruction's own flags count; the token inside a shell command means nothing to BuildKit.
const instructionFlags = (text) => /^[A-Z]+((?:\s+--\S+)*)/i.exec(text)[1].trim().split(/\s+/).filter(Boolean);
const isolated = (text) => {
  const network = instructionFlags(text).filter((flag) => flag.startsWith('--network='));
  return network.length > 0 && network.every((flag) => flag === '--network=none');
};
const mountSources = (text) =>
  instructionFlags(text)
    .filter((flag) => flag.startsWith('--mount='))
    .map((flag) => /[=,]from=([^,]+)/.exec(flag)?.[1]);

export function checkOfflineBuild(dockerfile) {
  if (/^#\s*syntax\s*=/im.test(dockerfile)) {
    return {
      errors: [`${DOCKERFILE}: remove the \`# syntax=\` directive; it downloads the build frontend from Docker Hub.`],
    };
  }

  const instructions = parseInstructions(dockerfile);

  const boundary = instructions.findIndex(({ text }) => NETWORK_BOUNDARY.test(text));
  if (boundary === -1) {
    const chained = instructions.find(({ text }) => /\bpnpm fetch\b/.test(text));
    return {
      errors: [
        chained
          ? `${DOCKERFILE}: line ${chained.line}: the \`pnpm fetch\` step must run nothing else; chained commands keep network access.`
          : `${DOCKERFILE}: no \`pnpm fetch\` step found; cannot locate the network boundary.`,
      ],
    };
  }

  // `COPY --from` and a mount's `from=` may name a stage (or its index); anything else is an image to pull.
  const stages = new Set(
    instructions
      .map(({ text }) => /^FROM(?:\s+--\S+)*\s+\S+\s+AS\s+(\S+)/i.exec(text)?.[1].toLowerCase())
      .filter(Boolean),
  );
  const pullsImage = (from) => from !== undefined && !/^\d+$/.test(from) && !stages.has(from.toLowerCase());
  const reachesNetwork = ({ text }) => {
    if (isRun({ text })) return !isolated(text) || mountSources(text).some(pullsImage);
    if (/^ADD\b/i.test(text)) return /(^|\s)(?:[a-z]+:\/\/|git@)/i.test(text.replace(/^ADD/i, ''));
    if (/^COPY\b/i.test(text)) {
      return pullsImage(
        instructionFlags(text)
          .find((flag) => flag.startsWith('--from='))
          ?.slice('--from='.length),
      );
    }
    return false;
  };
  const leaking = instructions.slice(boundary + 1).filter(reachesNetwork);

  if (leaking.length > 0) {
    return {
      errors: [
        `${DOCKERFILE}: steps after \`pnpm fetch\` that may reach the network (RUN without --network=none, ADD <url>, COPY --from=<image>, --mount=…,from=<image>):`,
        ...leaking.map(({ line, text }) => `  line ${line}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`),
      ],
    };
  }

  const runsBefore = instructions.slice(0, boundary + 1).filter(isRun).length;
  const runsAfter = instructions.slice(boundary + 1).filter(isRun).length;
  return {
    errors: [],
    summary:
      `${DOCKERFILE}: ${runsAfter} post-fetch RUN steps are --network=none, no ADD <url>, COPY --from=<image> or mount from an image ` +
      `(${runsBefore} steps before the boundary may use the registry).`,
  };
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const { errors, summary } = checkOfflineBuild(readFileSync(path.join(ROOT, DOCKERFILE), 'utf8'));
  if (errors.length > 0) {
    for (const message of errors) console.error(message);
    process.exitCode = 1;
  } else {
    console.log(summary);
  }
}
