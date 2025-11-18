export function copy(text: string) {
  navigator.clipboard?.writeText(text);
}
