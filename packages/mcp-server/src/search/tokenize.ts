const SPLIT = /[^\p{L}\p{N}]+/u;
const CAMEL_BOUNDARY = /(?<=\p{Ll})(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})|(?<=\p{L})(?=\p{N})|(?<=\p{N})(?=\p{L})/u;

export function tokenize(text: string) {
  const tokens: string[] = [];
  for (const word of text.split(SPLIT)) {
    if (!word) continue;
    tokens.push(word);
    const parts = word.split(CAMEL_BOUNDARY);
    if (parts.length > 1) tokens.push(...parts);
  }
  return tokens;
}
