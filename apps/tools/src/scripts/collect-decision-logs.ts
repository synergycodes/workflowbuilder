import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import { runScript } from '../tool-utils/create-script';

const ROOT_PATH = path.join(cwd(), '../../');
const OUTPUT_FILE = path.join(ROOT_PATH, 'DECISION-LOGS.md');
const TARGET_SUFFIX = 'decision-log.md';
const SCRIPT_NAME = 'Collect Decision Logs';

runScript(SCRIPT_NAME, async function () {
  const logs = await findDecisionLogs(ROOT_PATH);

  const logsSortedByDate = logs.sort((a, b) => {
    if (!a.date || !b.date) return 0;

    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);

    return dateA.getTime() - dateB.getTime();
  });

  const logList: string[] = [];

  for (const { originalPath, title, date } of logsSortedByDate) {
    if (!title || !date) {
      throw new Error(`Missing metadata in ${originalPath}`);
    }

    const rootRelativePath = path.relative(ROOT_PATH, originalPath);

    logList.push(`- _${date}_: [${title}](./${rootRelativePath})`);
  }

  const title = '# Decision Logs\n';
  const logContent = [title, ...logList].join('\n');

  await writeFile(OUTPUT_FILE, logContent);
});

async function findDecisionLogs(directory: string, logs: DecisionLogEntry[] = []): Promise<DecisionLogEntry[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await findDecisionLogs(fullPath, logs);
    } else if (entry.isFile() && entry.name.endsWith(TARGET_SUFFIX)) {
      const content = await readFile(fullPath, 'utf8');
      const { title, date } = extractMetadata(content);

      logs.push({
        originalPath: fullPath,
        filename: entry.name,
        title,
        date,
      });
    }
  }

  return logs;
}

function extractMetadata(content: string): { title?: string; date?: string } {
  const title = extractKeyword(content, 'Title');
  const date = extractKeyword(content, 'Date');

  return {
    title,
    date,
  };
}

function extractKeyword(content: string, keyword: string): string | undefined {
  const keywordMatch = content.match(new RegExp(`\\s*${keyword}:\\s*(.+?)$`, 'm'));

  return keywordMatch ? keywordMatch[1].trim() : undefined;
}

function parseDate(dateString: string): Date {
  const parts = dateString.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  const day = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10) - 1;
  const year = Number.parseInt(parts[2], 10);

  return new Date(year, month, day);
}

type DecisionLogEntry = {
  originalPath: string;
  filename: string;
  title?: string;
  date?: string;
};
