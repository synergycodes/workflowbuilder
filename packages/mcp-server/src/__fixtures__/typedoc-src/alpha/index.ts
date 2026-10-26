import type { HiddenOptions } from './hidden';

/**
 * Props accepted by the widget. It renders a title.
 *
 * @remarks Extra remarks text.
 * @category Core
 * @since 1.2.0
 */
export interface WidgetProps {
  /** Widget title. Shown in the header. */
  title: string;
  /**
   * Maximum width in pixels.
   *
   * @default 100
   */
  width?: number;
  /** Fires when the widget is clicked. */
  onClick(event: string): void;
  /** @internal */
  secret: string;
}

type Wrap<T> = T;

/**
 * Props wrapped in a generic.
 *
 * @category Core
 */
export type WrappedProps = Wrap<{
  /** Optional label. */
  a?: string;
  b: number;
}>;

/** Keys omitted from the base props. */
export type SlimProps = Omit<WidgetProps, 'onClick' | 'secret'>;

/** Runtime value of the mode. */
export const Mode = { A: 'a', B: 'b' } as const;

/** Type twin of the mode value. */
export type Mode = (typeof Mode)[keyof typeof Mode];

/** Doubles a string or a number. */
export function overloaded(a: string): string;
export function overloaded(a: number): number;
export function overloaded(a: string | number) {
  return a;
}

/**
 * Creates a widget.
 *
 * @category Core
 * @deprecated Use createWidget2.
 */
export function createWidget<T extends WidgetProps>(props: T, flag?: boolean): T {
  void flag;
  return props;
}

/** A class with a constructor. */
export class Engine {
  /** Engine name. */
  name = 'engine';

  constructor(options: { speed: number }) {
    this.name = String(options.speed);
  }

  /** Starts the engine. */
  start(times: number): Promise<void> {
    return Promise.resolve(void times);
  }
}

/** Colors of the palette. */
export enum Color {
  Red = 'red',
  Blue = 'blue',
}

/** @internal */
export const hidden = 1;

/** Same name in two packages, function here. */
export function Shared(): void {}

/** Documented only in this package. */
export const documented = 'x';

/** Alias of a type the package declares but does not export. */
export type Aliased = HiddenOptions;

/**
 * Settings with two shapes.
 *
 * @category Core
 */
export type Either = { kind: 'a'; shared: string; onlyA: number } | { kind: 'b'; shared: string; onlyB?: boolean };

/** A union of named object types. */
export type Named = FirstShape | SecondShape;

/** First shape. */
export interface FirstShape {
  /** Common to both shapes. */
  id: string;
  /** Only the first shape. */
  first: number;
}

/** Second shape. */
export interface SecondShape {
  id: string;
  second: boolean;
}

/** Many literal names. */
export type Letters = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';

/** A discriminated union whose variants share member names. */
export type Strategy =
  | { strategy: 'local'; error?: undefined; label?: string }
  | { strategy: 'api'; error: { code: number }; label: string }
  | { strategy: 'props'; error?: undefined };

/** Base with optional members. */
export interface LooseOptions {
  /** Label. */
  label?: string;
  /** Count. */
  count?: number;
}

/** Every member required. */
export type StrictOptions = Required<LooseOptions>;

/** Every member readonly. */
export type FrozenOptions = Readonly<LooseOptions>;
