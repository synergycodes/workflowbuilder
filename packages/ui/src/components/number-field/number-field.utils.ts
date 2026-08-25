import type { ClipboardEventHandler, ClipboardEvent as ReactClipboardEvent } from 'react';

const HAN_NUMERALS = '零〇一二三四五六七八九';

export function normalizeFinite(value: number | undefined) {
  return value === undefined || !Number.isFinite(value) ? undefined : value;
}

export function normalizeStep(step: number | 'any') {
  return step === 'any' || (Number.isFinite(step) && step > 0) ? step : 1;
}

function decimalPlaces(value: number) {
  const [coefficient, exponent = '0'] = value.toString().split('e');
  const fractionLength = coefficient.split('.')[1]?.length ?? 0;
  return Math.max(0, fractionLength - Number(exponent));
}

export function getSteppingMax(min: number | undefined, max: number | undefined, step: number | 'any') {
  if (max === undefined || step === 'any') return max;

  const base = min ?? 0;
  const stepCount = Math.floor((max - base) / step + 1e-10);
  const precision = Math.min(15, Math.max(decimalPlaces(base), decimalPlaces(step)));
  return Math.min(max, Number((base + stepCount * step).toFixed(precision)));
}

export function parsePastedNumber(value: string) {
  const parts = new Intl.NumberFormat().formatToParts(12_345.6);
  const group = parts.find((part) => part.type === 'group')?.value;
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
  let normalized = value
    .replaceAll(/\p{Cf}/gu, '')
    .trim()
    .replaceAll(/[−－‒–—﹣]/g, '-')
    .replaceAll(/[＋﹢]/g, '+');
  normalized = normalized.replaceAll(/[٠-٩۰-۹０-９]/g, (digit) => String((digit.codePointAt(0) ?? 0) % 16));
  normalized = normalized.replaceAll(/[零〇一二三四五六七八九]/g, (digit) =>
    String(Math.max(HAN_NUMERALS.indexOf(digit) - 1, 0)),
  );
  if (group) normalized = normalized.split(group).join('');
  normalized = normalized.split(decimal).join('.').replaceAll(/[．٫]/g, '.').replaceAll(/[，٬]/g, '');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function handleNumberPaste(
  event: ReactClipboardEvent<HTMLInputElement>,
  onPaste: ClipboardEventHandler<HTMLInputElement> | undefined,
) {
  onPaste?.(event);
  if (event.defaultPrevented) return;

  const start = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
  const end = event.currentTarget.selectionEnd ?? start;
  const pasted = event.clipboardData.getData('text/plain');
  const nextText = event.currentTarget.value.slice(0, start) + pasted + event.currentTarget.value.slice(end);
  if (parsePastedNumber(nextText) === null) event.preventDefault();
}

export function clearNumberInput(input: HTMLInputElement | null) {
  if (!input) return;

  const prototype = input.ownerDocument.defaultView?.HTMLInputElement.prototype;
  const setter = prototype && Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) setter.call(input, '');
  else input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
