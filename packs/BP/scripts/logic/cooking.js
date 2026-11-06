export const COOKED_AT = 160;
export const BURNT_AT = 760;

/**
 * @param {number} ticks
 * @returns {'raw' | 'cooked' | 'burnt'}
 */
export function cookStage(ticks) {
  if (ticks >= BURNT_AT) return 'burnt';
  if (ticks >= COOKED_AT) return 'cooked';
  return 'raw';
}
