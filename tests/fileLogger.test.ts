import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileLogger } from '../src/main/fileLogger';

describe('createFileLogger', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bi-log-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates nested folders and writes timestamped lines', () => {
    const file = join(dir, 'logs', 'updater.log');
    const log = createFileLogger(file, () => new Date('2026-01-02T03:04:05.000Z'));
    log.info('hello');
    log.error(new Error('boom'));
    const lines = readFileSync(file, 'utf8').split('\n');
    expect(lines[0]).toBe('2026-01-02T03:04:05.000Z [info] hello');
    expect(lines[1]).toContain('[error] Error: boom');
  });

  it('rotates large files', () => {
    const file = join(dir, 'updater.log');
    writeFileSync(file, 'x'.repeat(600 * 1024));
    createFileLogger(file).info('fresh');
    expect(existsSync(`${file}.old`)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('fresh');
  });

  it('never throws when the path is unusable', () => {
    const blocker = join(dir, 'file');
    writeFileSync(blocker, '');
    const log = createFileLogger(join(blocker, 'sub', 'x.log'));
    expect(() => log.info('ignored')).not.toThrow();
  });
});
