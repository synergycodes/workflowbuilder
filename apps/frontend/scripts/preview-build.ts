import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const root = path.join(__dirname, '../../../dist/apps/frontend');
const port = 6007;

app.use('/', express.static(root));

app.listen(port, () => {
  console.log(`✅ Workflow Builder is now available at http://localhost:${port}/`);
});
