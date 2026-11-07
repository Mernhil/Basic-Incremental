import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSaveStore } from '../src/main/saveStore';

describe('createSaveStore', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bi-save-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns nulls when nothing was saved yet', () => {
    expect(createSaveStore(join(dir, 'nested')).read()).toEqual({ primary: null, backup: null });
  });

  it('round-trips text and creates the folder', () => {
    const store = createSaveStore(join(dir, 'nested', 'saves'));
    store.write('{"a":1}');
    expect(store.read().primary).toBe('{"a":1}');
    expect(store.read().backup).toBeNull();
  });

  it('keeps the previous save as a backup before overwriting', () => {
    const store = createSaveStore(dir);
    store.write('{"n":1}');
    store.write('{"n":2}');
    store.write('{"n":3}');
    expect(store.read()).toEqual({ primary: '{"n":3}', backup: '{"n":2}' });
    expect(existsSync(join(dir, 'save.json.tmp'))).toBe(false);
  });

  it('does not let a corrupted main file overwrite a good backup', () => {
    const store = createSaveStore(dir);
    store.write('{"n":1}');
    store.write('{"n":2}'); // backup = n1
    writeFileSync(join(dir, 'save.json'), '{"n":2', 'utf8'); // corrupt the main file
    store.write('{"n":3}');
    expect(readFileSync(join(dir, 'save.bak.json'), 'utf8')).toBe('{"n":1}');
    expect(store.read().primary).toBe('{"n":3}');
    // the damaged file is preserved for manual recovery rather than destroyed
    expect(readFileSync(join(dir, 'save.corrupt.json'), 'utf8')).toBe('{"n":2');
  });
});
