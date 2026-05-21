export function getIsStringNumber(variable: string | undefined) {
  return typeof variable === 'string' && !Number.isNaN(Number(variable)) && variable.trim() !== '';
}
