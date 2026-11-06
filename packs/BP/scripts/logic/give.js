/**
 * Puts an item into a container; whatever does not fit is handed to `drop`.
 * @template T
 * @param {{ addItem(item: T): T | undefined }} container
 * @param {T} item
 * @param {(item: T) => void} drop
 * @returns {void}
 */
export function giveOrDrop(container, item, drop) {
  const leftover = container.addItem(item);
  if (leftover !== undefined) drop(leftover);
}
