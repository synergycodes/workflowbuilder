import { createContext } from 'react';

/** Whether the enclosing `Menu` is open; `false` outside of a `Menu`. */
export const MenuOpenContext = createContext(false);
