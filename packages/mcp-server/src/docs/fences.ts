export const FENCE = /^\s*(```|~~~)/;

export function mapOutsideFences(markdown: string, mapLine: (line: string) => string) {
  let inFence = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (FENCE.test(line)) inFence = !inFence;
      return inFence ? line : mapLine(line);
    })
    .join('\n');
}
