export function remarkBasePathLinks({ base }) {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;

  function walkTree(node) {
    if (node.type === 'link' && typeof node.url === 'string') {
      const isAbsoluteInternal =
        node.url.startsWith('/') && !node.url.startsWith('//');
      const isAlreadyPrefixed = node.url.startsWith(prefix + '/');

      if (isAbsoluteInternal && !isAlreadyPrefixed) {
        node.url = prefix + node.url;
      }
    }

    if (node.children) {
      for (const child of node.children) {
        walkTree(child);
      }
    }
  }

  return function transformer(tree) {
    walkTree(tree);
  };
}
