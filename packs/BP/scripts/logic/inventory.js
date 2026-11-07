/**
 * Inventory helpers over a container-like object (the real `Container` or a test fake).
 * `getItem` returns a copy, so a changed stack is written back with `setItem`.
 * @template {{ typeId: string, amount: number }} T
 * @typedef {{ size: number, getItem(slot: number): T | undefined, setItem(slot: number, item?: T): void }} ContainerLike
 */

/**
 * Whether any slot holds the item.
 * @template {{ typeId: string, amount: number }} T
 * @param {ContainerLike<T>} container
 * @param {string} itemId
 * @returns {boolean}
 */
export function hasItem(container, itemId) {
  for (let i = 0; i < container.size; i++) {
    if (container.getItem(i)?.typeId === itemId) return true;
  }
  return false;
}

/**
 * Removes exactly one of the item from the first slot holding it.
 * @template {{ typeId: string, amount: number }} T
 * @param {ContainerLike<T>} container
 * @param {string} itemId
 * @returns {boolean} whether one was removed
 */
export function removeOne(container, itemId) {
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item?.typeId !== itemId) continue;
    if (item.amount > 1) {
      item.amount -= 1;
      container.setItem(i, item);
    } else {
      container.setItem(i, undefined);
    }
    return true;
  }
  return false;
}
