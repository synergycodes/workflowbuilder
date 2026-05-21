// This file is served if the real file does not exist.
// Provides a no-op `plugin` so consumers using the factory API
// (`import { plugin }` / `import * as X` + `X.plugin`) keep compiling
// and running when a plugin folder is missing or excluded.
export const plugin = () => {};
