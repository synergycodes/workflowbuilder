// The range straddles the diagram's threshold of 100, so about half the runs take each branch.
const AMOUNT_RANGE = { min: 1, max: 200 } as const;

export function drawAmount(): number {
  const span = AMOUNT_RANGE.max - AMOUNT_RANGE.min + 1;
  return AMOUNT_RANGE.min + Math.floor(Math.random() * span);
}
