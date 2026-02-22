import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() }));
vi.mock('ora', () => {
  const spinner = {
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    stop: vi.fn(),
    stopAndPersist: vi.fn(),
    text: '',
  };
  spinner.start.mockReturnValue(spinner);
  return { default: vi.fn(() => spinner) };
});
vi.mock('consola', () => ({ consola: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() } }));
vi.mock('prompts', () => ({ default: vi.fn() }));
vi.mock('yaml', () => ({ parse: vi.fn(), stringify: vi.fn() }));

import { readFile } from 'node:fs/promises';
import prompts from 'prompts';
import { parse as yaml } from 'yaml';
import { getConfig } from '../config.js';

const mockReadFile = vi.mocked(readFile);
const mockPrompts = vi.mocked(prompts);
const mockYaml = vi.mocked(yaml);

beforeEach(() => {
  vi.clearAllMocks();
  // prevent real process.exit
  vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit');
  }) as never);
});

describe('interactive getConfig', () => {
  it('prompts for missing keys and returns merged config', async () => {
    // simulate no default config found
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockYaml.mockReturnValue({});

    // queue of prompt return values
    const values = [
      { value: 'https://interactive.example' }, // endpoint
      { value: 'interactive-token' }, // accessToken
      { value: true }, // rejectMedia
      { value: false }, // rejectReports
      { value: true }, // obfuscate
      { value: 'noop' }, // severity
      { value: '/tmp/blocklist.csv' }, // blocklist
      { value: 'public' }, // publicComment
      { value: 'private' }, // privateComment
      { value: true }, // save
    ];

    mockPrompts.mockImplementation(() => Promise.resolve(values.shift() as any));

    const flags = { nonInteractive: false } as any;
    const cfg = await getConfig(flags);

    expect(cfg.endpoint).toBe('https://interactive.example');
    expect(cfg.accessToken).toBe('interactive-token');
    expect(cfg.blocklist).toBe('/tmp/blocklist.csv');
    expect(cfg.publicComment).toBe('public');
    expect(cfg.privateComment).toBe('private');
    expect(cfg.save).toBe(true);
  });

  it('respects flags and does not prompt for provided flags', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockYaml.mockReturnValue({});

    const values: any[] = [
      { value: 'interactive-token' }, // accessToken
      { value: true }, // rejectMedia
      { value: false }, // rejectReports
      { value: false }, // obfuscate
      { value: 'silence' }, // severity
      { value: '/tmp/blocklist.csv' },
      { value: 'pub' },
      { value: 'priv' },
      { value: false },
    ];

    mockPrompts.mockImplementation(() => Promise.resolve(values.shift() as any));

    const flags = { nonInteractive: false, endpoint: 'https://flag.example' } as any;
    const cfg = await getConfig(flags);

    expect(cfg.endpoint).toBe('https://flag.example');
    expect(cfg.accessToken).toBe('interactive-token');
  });

  it('throws when required keys are missing in non-interactive mode', async () => {
    // simulate default config existing but missing required keys
    mockReadFile.mockResolvedValue('blocklist: /tmp/foo');
    mockYaml.mockReturnValue({});

    const flags = { nonInteractive: true } as any;

    await expect(getConfig(flags)).rejects.toThrow('Mastodon server URL and access token are required.');
  });
});
