export type HandleItemMove = (event: React.MouseEvent, index: number, direction: 'up' | 'down') => void;

export function onMoveItem<T>(event: React.MouseEvent, index: number, direction: 'up' | 'down', items: T[]) {
  event.preventDefault();
  event.stopPropagation();

  if (items.length === 0 || index < 0 || index >= items.length) {
    return items;
  }

  const newItems = [...items];

  const swapIndex = direction === 'up' ? index - 1 : index + 1;

  if (swapIndex < 0 || swapIndex >= newItems.length) {
    return items;
  }

  // swap items
  [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];

  return newItems;
}
