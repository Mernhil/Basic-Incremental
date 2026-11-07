import { appendFileSync, mkdirSync, statSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

/** Minimal logger shape accepted by electron-updater. */
export interface FileLogger {
  info(message?: unknown): void;
  warn(message?: unknown): void;
  error(message?: unknown): void;
  debug(message?: string): void;
}

const MAX_BYTES = 512 * 1024;

function stringify(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Appends timestamped lines to `filePath`. Never throws: logging must not be able to
 * crash the app. Rotates the file to `<filePath>.old` once it passes ~512 KB.
 */
export function createFileLogger(filePath: string, now: () => Date = () => new Date()): FileLogger {
  const write = (level: string, message: unknown): void => {
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      try {
        if (statSync(filePath).size > MAX_BYTES) renameSync(filePath, `${filePath}.old`);
      } catch {
        // file does not exist yet
      }
      appendFileSync(filePath, `${now().toISOString()} [${level}] ${stringify(message)}\n`);
    } catch {
      // ignore: logging is best-effort
    }
  };

  return {
    info: (m) => write('info', m),
    warn: (m) => write('warn', m),
    error: (m) => write('error', m),
    debug: (m) => write('debug', m),
  };
}
