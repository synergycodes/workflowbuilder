export function sortByPriority(a: { priority?: number }, b: { priority?: number }) {
  return (b.priority || 0) - (a.priority || 0);
}
