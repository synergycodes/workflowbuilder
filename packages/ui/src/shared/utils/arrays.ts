export function rangeBetween<const T extends readonly string[]>(list: T, from: T[number], to: T[number]): T[number][] {
  const fromIndex = list.indexOf(from);
  const toIndex = list.indexOf(to);

  return fromIndex !== -1 && toIndex !== -1 && fromIndex <= toIndex ? list.slice(fromIndex, toIndex + 1) : [];
}
