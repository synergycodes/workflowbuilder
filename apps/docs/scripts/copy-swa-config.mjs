// Azure Static Web Apps reads staticwebapp.config.json from the artifact root,
// which is `dist` — the site sits one level down in `dist/docs`. Astro's
// `public/` copies into `dist/docs`, one level too deep, so copy it here.
import { copyFileSync, mkdirSync } from 'node:fs';

const source = './staticwebapp.config.json';
const target = './dist/staticwebapp.config.json';

mkdirSync('./dist', { recursive: true });
copyFileSync(source, target);
