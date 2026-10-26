// Lines the cleaner renders from component data or adds for the reader. They are returned in content but not ranked:
// their words would otherwise outrank the prose that explains theming and plugins.
export const CSS_VARIABLES_LABEL = 'CSS variables you can override';
export const CSS_VARIABLE_PREFIX = '--wb-public-';
// Must match the OverflowCard template in config/mdx-components.ts.
const OVERFLOW_NOTE = '> Powered by Overflow';

const UNRANKED_LINE_PREFIXES = [CSS_VARIABLES_LABEL, OVERFLOW_NOTE];

// A list item that opens with a link to another docs page ("See also", "Next steps"): its words describe the linked page.
const LINK_LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\[[^\]]+\]\(\//;

// A link target the cleaner appends after its text.
const DISPLAY_URL = /\s\(https?:\/\/[^)\s]*\)/g;

export function rankableText(text: string) {
  return text
    .split('\n')
    .filter((line) => !UNRANKED_LINE_PREFIXES.some((prefix) => line.startsWith(prefix)) && !LINK_LIST_ITEM.test(line))
    .join('\n')
    .replaceAll(DISPLAY_URL, '');
}
