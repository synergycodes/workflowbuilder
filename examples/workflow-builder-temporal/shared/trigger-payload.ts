// The decision node routes on `amount`. 1 to 200 straddles its threshold of 100, so about half
// the runs take each branch.
export function drawTriggerPayload(): { amount: number; customer: string } {
  return { amount: 1 + Math.floor(Math.random() * 200), customer: 'Ada' };
}
