/** Round away floating point dust and normalize -0 to 0. */
export const clean = (n: number): number => {
  const r = Math.round(n * 1e9) / 1e9;
  return Object.is(r, -0) ? 0 : r;
};

let counter = 0;
/** Monotonic id generator for AST-derived UI tokens. */
export const uid = (prefix = 'n'): string => `${prefix}_${(counter++).toString(36)}`;
