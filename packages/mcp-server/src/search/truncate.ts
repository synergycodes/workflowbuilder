import { estimateTokens } from './tokens.js';

const TRUNCATION_MARKER = '\n…[truncated]';

interface Truncated {
  text: string;
  truncated: boolean;
}

function insideOpenFence(text: string) {
  let open = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) open = !open;
  }
  return open;
}

export function truncateToTokens(text: string, maxTokens: number): Truncated {
  if (estimateTokens(text) <= maxTokens) return { text, truncated: false };
  const limit = maxTokens * 4;
  const newline = text.lastIndexOf('\n', limit);
  let cut = text.slice(0, newline > 0 ? newline : limit);
  if (insideOpenFence(cut)) cut += '\n```';
  return { text: cut + TRUNCATION_MARKER, truncated: true };
}

export function excerpt(text: string, maxChars: number): Truncated {
  if (text.length <= maxChars) return { text, truncated: false };
  let budget = maxChars - 1;
  for (;;) {
    const space = text.slice(0, budget).search(/\s\S*$/);
    let cut = text.slice(0, space > 0 ? space : budget).trimEnd() + '…';
    if (insideOpenFence(cut)) cut += '\n```';
    if (cut.length <= maxChars || budget <= 1) return { text: cut, truncated: true };
    budget -= cut.length - maxChars;
  }
}

export function truncateInline(text: string, maxTokens: number) {
  if (estimateTokens(text) <= maxTokens) return text;
  return text.slice(0, Math.max(0, maxTokens * 4 - 1)).trimEnd() + '…';
}

const LEAD_FRACTION = 5;
const LEADING_MARKER = '…\n';
const FENCE_OPENER = '```\n';

// An excerpt of at most `maxChars` that opens `start` characters into the text, on a line or word boundary a little before it.
export function excerptFrom(text: string, maxChars: number, start: number): Truncated {
  if (start <= 0) return excerpt(text, maxChars);
  const lead = Math.floor(maxChars / LEAD_FRACTION);
  let begin = Math.max(0, start - lead);
  const lineStart = text.lastIndexOf('\n', begin);
  if (lineStart !== -1 && begin - lineStart <= lead) {
    begin = lineStart + 1;
  } else {
    const wordBreak = text.slice(begin).search(/\s/);
    if (wordBreak !== -1 && wordBreak < lead) begin += wordBreak + 1;
  }
  const reopenFence = insideOpenFence(text.slice(0, begin));
  const rest = excerpt((reopenFence ? FENCE_OPENER : '') + text.slice(begin), maxChars - LEADING_MARKER.length);
  return { text: LEADING_MARKER + rest.text, truncated: true };
}
