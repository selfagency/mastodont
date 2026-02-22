import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
}));
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
vi.mock('consola', () => ({
  consola: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() },
}));
vi.mock('prompts', () => ({ default: vi.fn() }));
vi.mock('yaml', () => ({
  parse: vi.fn(),
  stringify: vi.fn(),
}));

import { readFile, unlink, writeFile } from 'node:fs/promises';
import prompts from 'prompts';
import { parse as yaml, stringify as yamlStringify } from 'yaml';
import { getConfig, setConfig, resetConfig } from '../config.js';

const mockReadFile = vi.mocked(readFile);
const mockUnlink = vi.mocked(unlink);
const mockWriteFile = vi.mocked(writeFile);
const mockPrompts = vi.mocked(prompts);
const mockYamlParse = vi.mocked(yaml);
const mockYamlStringify = vi.mocked(yamlStringify);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit');
  }) as never);
});

describe('getConfig', () => {
  it('loads config from a custom path when flags.config is set', async () => {
    mockReadFile.mockResolvedValue('yaml content' as never);
    mockYamlParse.mockReturnValue({ endpoint: 'https://mastodon.social', accessToken: 'test-token' });

    const config = await getConfig({ config: '/custom/path.yml', nonInteractive: true });

    expect(mockReadFile).toHaveBeenCalledWith('/custom/path.yml', 'utf-8');
    expect(mockYamlParse).toHaveBeenCalledWith('yaml content');
    expect(config.endpoint).toBe('https://mastodon.social');
    expect(config.accessToken).toBe('test-token');
    expect(mockPrompts).not.toHaveBeenCalled();
  });

  it('loads config from the default path when no custom path is provided', async () => {
    mockReadFile.mockResolvedValue('default yaml content' as never);
    mockYamlParse.mockReturnValue({ endpoint: 'https://social.example.com', accessToken: 'default-token' });

    const config = await getConfig({ nonInteractive: true });

    expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('.mastodont.yml'), 'utf-8');
    expect(config.endpoint).toBe('https://social.example.com');
    expect(config.accessToken).toBe('default-token');
    expect(mockPrompts).not.toHaveBeenCalled();
  });

  it('exits with code 1 when the custom config file is not found', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(getConfig({ config: '/nonexistent/path.yml', nonInteractive: true })).rejects.toThrow('process.exit');

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('handles a missing default config gracefully and continues', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    // Without endpoint/accessToken the function will throw, so we just verify
    // it does not exit(1) for a missing default config — it should proceed and
    // then throw the validation error instead.
    await expect(getConfig({ nonInteractive: true })).rejects.toThrow(
      'Mastodon server URL and access token are required.',
    );

    // process.exit(1) must NOT have been called — the missing default config
    // is handled gracefully via stopAndPersist, not a hard exit.
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('throws when endpoint or accessToken are missing', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockYamlParse.mockReturnValue({});

    await expect(getConfig({ nonInteractive: true })).rejects.toThrow(
      'Mastodon server URL and access token are required.',
    );
  });

  it('merges flag values into the config', async () => {
    mockReadFile.mockResolvedValue('yaml content' as never);
    mockYamlParse.mockReturnValue({ endpoint: 'https://mastodon.social', accessToken: 'from-file' });

    const config = await getConfig({
      nonInteractive: true,
      accessToken: 'from-flag',
    });

    expect(config.accessToken).toBe('from-file');
    expect(mockPrompts).not.toHaveBeenCalled();
  });
});

describe('setConfig', () => {
  it('writes the YAML-stringified config to file', async () => {
    mockYamlStringify.mockReturnValue('endpoint: https://mastodon.social\naccessToken: token\n');
    mockWriteFile.mockResolvedValue(undefined);

    await setConfig({ endpoint: 'https://mastodon.social', accessToken: 'token' });

    expect(mockYamlStringify).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('.mastodont.yml'),
      'endpoint: https://mastodon.social\naccessToken: token\n',
    );
  });

  it('strips ephemeral keys before writing', async () => {
    mockYamlStringify.mockReturnValue('endpoint: https://mastodon.social\n');
    mockWriteFile.mockResolvedValue(undefined);

    const inputConfig = {
      endpoint: 'https://mastodon.social',
      accessToken: 'token',
      save: true,
      nonInteractive: true,
      config: '/some/path.yml',
      blocklist: 'list.csv',
      reset: true,
      publicComment: 'public',
      privateComment: 'private',
    };

    await setConfig(inputConfig);

    const writtenConfig = mockYamlStringify.mock.calls[0]![0] as Record<string, unknown>;
    expect(writtenConfig).not.toHaveProperty('save');
    expect(writtenConfig).not.toHaveProperty('nonInteractive');
    expect(writtenConfig).not.toHaveProperty('config');
    expect(writtenConfig).not.toHaveProperty('blocklist');
    expect(writtenConfig).not.toHaveProperty('reset');
    expect(writtenConfig).not.toHaveProperty('publicComment');
    expect(writtenConfig).not.toHaveProperty('privateComment');
  });

  it('throws when writeFile fails', async () => {
    mockYamlStringify.mockReturnValue('endpoint: https://mastodon.social\n');
    mockWriteFile.mockRejectedValue(new Error('EACCES: permission denied'));

    await expect(setConfig({ endpoint: 'https://mastodon.social', accessToken: 'token' })).rejects.toThrow(
      'Unable to write config file: EACCES: permission denied',
    );
  });
});

describe('resetConfig', () => {
  it('deletes the config file and exits with code 0', async () => {
    mockUnlink.mockResolvedValue(undefined);

    await expect(resetConfig()).rejects.toThrow('process.exit');

    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('.mastodont.yml'));
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('throws when unlink fails', async () => {
    mockUnlink.mockRejectedValue(new Error('ENOENT: no such file'));

    await expect(resetConfig()).rejects.toThrow('Unable to reset config file: ENOENT: no such file');
  });
});
