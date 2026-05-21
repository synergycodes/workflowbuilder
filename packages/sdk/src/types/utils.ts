export type Override<A, B> = Omit<A, keyof B> & B;
