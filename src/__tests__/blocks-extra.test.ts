import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node-fetch', () => ({ default: vi.fn() }));
vi.mock('fs/promises', () => ({ readFile: vi.fn() }));
vi.mock('is-url-superb', () => ({ default: vi.fn() }));
vi.mock('ora', () => {
  const spinner = {
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    warn: vi.fn(),
    stopAndPersist: vi.fn(),
    text: '',
  };
  spinner.start.mockReturnValue(spinner);
  return { default: vi.fn(() => spinner) };
});
vi.mock('consola', () => ({ consola: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() } }));

import { readFile } from 'fs/promises';
import isUrl from 'is-url-superb';
import fetch from 'node-fetch';
import { setBlocks } from '../blocks.js';
import type { MastodontConfig } from '../types/index.js';

const mockFetch = vi.mocked(fetch);
const mockReadFile = vi.mocked(readFile);
const mockIsUrl = vi.mocked(isUrl);

const createMockResponse = (status: number, body: unknown, linkHeader: string | null = null) => ({
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  headers: { get: (name: string) => (name === 'link' ? linkHeader : null) },
});

const baseConfig: MastodontConfig = {
  endpoint: 'https://mastodon.example',
  accessToken: 'test-token',
};

let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  // make process.exit throw so we can assert it was called without exiting the test runner
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit');
  }) as never);
});

describe('blocks extra edge cases', () => {
  it('exits when POST handler throws inside processBatches', async () => {
    // getBlocks -> returns empty list
    mockFetch.mockResolvedValueOnce(createMockResponse(200, [], null) as never);
    // subsequent POST will reject
    mockFetch.mockRejectedValueOnce(new Error('network fail'));

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('new.example\n' as never);

    const config: MastodontConfig = { ...baseConfig, blocklist: '/path/to/blocklist.txt' };

    await expect(setBlocks(config)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalled();
  });

  it('does not set reject_media/reject_reports when severity is suspend', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never) // getBlocks
      .mockResolvedValueOnce(createMockResponse(200, {}) as never); // POST

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('suspend.example\n' as never);

    const config: MastodontConfig = { ...baseConfig, blocklist: '/path/to/blocklist.txt', severity: 'suspend' };

    await setBlocks(config);

    // find POST calls
    const postCalls = mockFetch.mock.calls.filter(([, opts]) => (opts as any)?.method === 'POST');
    expect(postCalls.length).toBe(1);
    const body = new URLSearchParams(postCalls[0]![1]!.body as string);
    expect(body.get('reject_media')).toBeNull();
    expect(body.get('reject_reports')).toBeNull();
  });

  it('exits when allowlist loading fails', async () => {
    // getBlocks -> returns empty list
    mockFetch.mockResolvedValueOnce(createMockResponse(200, [], null) as never);

    mockIsUrl.mockReturnValue(false);
    // blocklist load succeeds, allowlist load fails
    mockReadFile.mockResolvedValueOnce('a.example\n' as never).mockRejectedValueOnce(new Error('read fail'));

    const config: MastodontConfig = {
      ...baseConfig,
      blocklist: '/path/to/blocklist.txt',
      allowlist: '/path/to/allowlist.txt',
    };

    await expect(setBlocks(config)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalled();
  });
});
