// The range straddles the diagram's threshold of 100, so about half the runs take each branch.
export const AMOUNT_RANGE = { min: 1, max: 200 } as const;

export function drawAmount(): number {
  const span = AMOUNT_RANGE.max - AMOUNT_RANGE.min + 1;
  return AMOUNT_RANGE.min + Math.floor(Math.random() * span);
}

export function parseAmount(raw?: string | undefined): number | undefined {
  if (raw === undefined) return undefined;

  const amount = Number(raw);
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error(`"${raw}" is not an amount. Pass a positive whole number, for example: npm run workflow -- 50`);
  }

  return amount;
}
