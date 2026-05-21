export function getIsValidJson(value: string): boolean {
  try {
    JSON.parse(value);

    return true;
  } catch {
    return false;
  }
}
