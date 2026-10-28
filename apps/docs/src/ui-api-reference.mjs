/** Directory of the UI API Reference, both under the docs content root and in page URLs. */
export const UI_API_REFERENCE_DIRECTORY = 'ui-api';

const TYPE_LINK_RE = /\{@link (?<pagePath>\S+) (?<name>[^}]+)\}/g;

/** Marks `name` in a Props-table type string as a link to its UI API Reference page (`<category>/<name>`). */
export function formatTypeLink(pagePath, name) {
  return `{@link ${pagePath} ${name}}`;
}

/** Splits a Props-table type string into plain text and linked type names; `hrefFor` maps a page path to a URL. */
export function splitTypeLinks(type, hrefFor) {
  const segments = [];
  let textStart = 0;
  for (const match of type.matchAll(TYPE_LINK_RE)) {
    const [marker] = match;
    const { pagePath, name } = match.groups;
    segments.push({ text: type.slice(textStart, match.index) }, { text: name, href: hrefFor(pagePath) });
    textStart = match.index + marker.length;
  }
  segments.push({ text: type.slice(textStart) });
  return segments;
}

export function stripTypeLinks(type) {
  return type.replaceAll(TYPE_LINK_RE, '$<name>');
}

export function containsTypeLink(text) {
  return text.search(TYPE_LINK_RE) !== -1;
}
