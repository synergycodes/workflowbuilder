// Cross-platform replacement for `touch ./dist/index.html`.
// `touch` is a Unix-only binary, so the build script breaks on Windows native.
// Ensures dist/index.html exists with a current mtime after astro build —
// including the parent directory if astro never produced it (failed build,
// manual invocation outside the build chain).
import { closeSync, mkdirSync, openSync, utimesSync } from 'node:fs';

const path = './dist/index.html';
mkdirSync('./dist', { recursive: true });
const fd = openSync(path, 'a');
closeSync(fd);
utimesSync(path, new Date(), new Date());
