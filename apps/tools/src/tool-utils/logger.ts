import chalk from 'chalk';
import { pipe } from 'remeda';

export class Logger {
  constructor(private prefix?: string) {}

  private lastHeader = '';

  private log(message: string, options: LogOptions = {}) {
    const level = options.level ?? 'info';
    const emoji = options.emoji ?? DEFAULT_EMOJIS[level];
    const prefix = options.prefix ?? '';
    const color = DEFAULT_COLORS[level];

    const header = formatHeader([LOGGER_BASE_PREFIX, this.prefix + prefix].join(' • '));

    const headerChanged = this.lastHeader !== header;
    if (headerChanged) {
      console.log();
      console.log(`${emoji} ${header}`);
      this.lastHeader = header;
    }

    console.group();
    console.log(color(chalk.dim(message)));
    console.groupEnd();
  }

  success(message: string, prefix?: string) {
    this.log(message, { level: 'success', prefix });
  }

  warning(message: string, prefix?: string) {
    this.log(message, { level: 'warning', prefix });
  }

  error(message: string, prefix?: string) {
    this.log(message, { level: 'error', prefix });
  }

  info(message: string, prefix?: string) {
    this.log(message, { level: 'info', prefix });
  }

  taskSuccess(taskName: string, time?: number, prefix?: string) {
    const formattedName = pipe(taskName, chalk.bold, chalk.white);

    this.log(`${formattedName} completed${time ? ` in ${time.toFixed(0)}ms` : ''}`, {
      level: 'success',
      prefix,
    });
  }

  taskFailure(taskName: string, errorMessage: string, prefix?: string) {
    this.log(`Task "${taskName}" failed: ${errorMessage}`, {
      level: 'error',
      prefix,
    });
  }
}

function formatHeader(text: string) {
  return pipe(text, chalk.bold, chalk.magenta);
}

const LOGGER_BASE_PREFIX = 'WORKFLOW BUILDER';

const DEFAULT_EMOJIS: Record<LogLevel, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

const DEFAULT_COLORS: Record<LogLevel, (text: string) => string> = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
};

type LogLevel = 'info' | 'success' | 'warning' | 'error';

interface LogOptions {
  level?: LogLevel;
  emoji?: string;
  prefix?: string;
}
