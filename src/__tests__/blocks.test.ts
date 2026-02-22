import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

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
vi.mock('consola', () => ({
  consola: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() },
}));

import fetch from 'node-fetch';
import ora from 'ora';
import { consola } from 'consola';
import { readFile } from 'fs/promises';
import isUrl from 'is-url-superb';
import { getBlocks, setBlocks, loadDomainList, removeBlocks } from '../blocks.js';
import type { Block, MastodontConfig } from '../types/index.js';

type MockSpinner = {
  start: Mock;
  succeed: Mock;
  fail: Mock;
  warn: Mock;
  stopAndPersist: Mock;
  text: string;
};

const mockFetch = vi.mocked(fetch);
const mockReadFile = vi.mocked(readFile);
const mockIsUrl = vi.mocked(isUrl);
const mockConsola = vi.mocked(consola);
const spinner = vi.mocked(ora)('') as unknown as MockSpinner;

let exitSpy: Mock;

const createMockResponse = (status: number, body: unknown, linkHeader: string | null = null) => ({
  status,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  headers: { get: (name: string) => (name === 'link' ? linkHeader : null) },
});

const createBlock = (domain: string): Block => ({
  id: '1',
  domain,
  created_at: '2024-01-01',
  severity: 'silence',
  reject_media: false,
  reject_reports: false,
  obfuscate: false,
});

const baseConfig: MastodontConfig = {
  endpoint: 'https://mastodon.example',
  accessToken: 'test-token',
};

const callsByMethod = (method: string) =>
  mockFetch.mock.calls.filter(([, opts]) => (opts as { method?: string } | undefined)?.method === method);

beforeEach(() => {
  vi.clearAllMocks();
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit');
  }) as never) as unknown as Mock;
});

describe('getBlocks', () => {
  it('fetches blocks successfully on a single page with no Link header', async () => {
    const blocks = [createBlock('evil.example'), createBlock('spam.example')];
    mockFetch.mockResolvedValueOnce(createMockResponse(200, blocks) as never);

    const result = await getBlocks(baseConfig, false);

    expect(result).toEqual(blocks);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://mastodon.example/api/v1/admin/domain_blocks',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    );
  });

  it('handles pagination via Link header across two pages', async () => {
    const page1 = [createBlock('page1.example')];
    const page2 = [createBlock('page2.example')];
    const linkHeader = '<https://mastodon.example/api/v1/admin/domain_blocks?page=2>; rel="next"';

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, page1, linkHeader) as never)
      .mockResolvedValueOnce(createMockResponse(200, page2, null) as never);

    const result = await getBlocks(baseConfig, false);

    expect(result).toEqual([...page1, ...page2]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://mastodon.example/api/v1/admin/domain_blocks?page=2',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    );
  });

  it('throws when the API returns a non-200 status', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(403, { error: 'Forbidden' }) as never);

    await expect(getBlocks(baseConfig, false)).rejects.toThrow('Failed to retrieve current domain blocks.');
  });

  it('does not create a spinner in quiet mode', async () => {
    const blocks = [createBlock('quiet.example')];
    mockFetch.mockResolvedValueOnce(createMockResponse(200, blocks) as never);

    const result = await getBlocks(baseConfig, true);

    expect(result).toEqual(blocks);
    expect(vi.mocked(ora)).not.toHaveBeenCalled();
  });

  it('sends the correct Authorization header', async () => {
    const config: MastodontConfig = { endpoint: 'https://social.test', accessToken: 'my-secret' };
    mockFetch.mockResolvedValueOnce(createMockResponse(200, []) as never);

    await getBlocks(config, true);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://social.test/api/v1/admin/domain_blocks',
      expect.objectContaining({
        headers: { Authorization: 'Bearer my-secret' },
      }),
    );
  });
});

describe('setBlocks', () => {
  it('sends POST requests for new domains not in current blocks', async () => {
    const config: MastodontConfig = {
      ...baseConfig,
      blocklist: '/path/to/blocklist.txt',
      severity: 'silence',
    };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('new.example\nanother.example\n' as never);

    await setBlocks(config);

    const postCalls = callsByMethod('POST');
    expect(postCalls).toHaveLength(2);
    expect(postCalls[0]![0]).toBe('https://mastodon.example/api/v1/admin/domain_blocks');
    expect(postCalls[1]![0]).toBe('https://mastodon.example/api/v1/admin/domain_blocks');
  });

  it('skips domains already present in current blocks', async () => {
    const config: MastodontConfig = { ...baseConfig, blocklist: '/path/to/blocklist.txt' };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [createBlock('existing.example')], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('existing.example\nnew.example\n' as never);

    await setBlocks(config);

    const postCalls = callsByMethod('POST');
    expect(postCalls).toHaveLength(1);
    const body = new URLSearchParams(postCalls[0]![1]!.body as string);
    expect(body.get('domain')).toBe('new.example');
  });

  it('calls process.exit(0) when all blocklist domains are already blocked', async () => {
    const config: MastodontConfig = { ...baseConfig, blocklist: '/path/to/blocklist.txt' };

    mockFetch.mockResolvedValueOnce(createMockResponse(200, [createBlock('existing.example')], null) as never);
    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('existing.example\n' as never);

    await expect(setBlocks(config)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('reads blocklist from a local file when isUrl returns false', async () => {
    const config: MastodontConfig = { ...baseConfig, blocklist: '/etc/blocklist.txt' };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('file.example\n' as never);

    await setBlocks(config);

    expect(mockReadFile).toHaveBeenCalledWith('/etc/blocklist.txt', 'utf8');
  });

  it('reads blocklist from a URL when isUrl returns true', async () => {
    const config: MastodontConfig = {
      ...baseConfig,
      blocklist: 'https://blocklist.example/list.txt',
    };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValueOnce(createMockResponse(200, 'remote.example\nother.example\n') as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(true);

    await setBlocks(config);

    expect(mockIsUrl).toHaveBeenCalledWith('https://blocklist.example/list.txt');
    expect(mockFetch).toHaveBeenCalledWith('https://blocklist.example/list.txt');
  });

  it('calls process.exit(1) when no blocklist is specified in config', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(200, [], null) as never);

    await expect(setBlocks(baseConfig)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('handles 422 responses silently without counting as failures', async () => {
    const config: MastodontConfig = { ...baseConfig, blocklist: '/path/to/blocklist.txt' };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(422, { error: 'already blocked' }) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('already.example\n' as never);

    await setBlocks(config);

    expect(mockConsola.debug).toHaveBeenCalledWith(expect.stringContaining('422'));
    expect(spinner.warn).not.toHaveBeenCalled();
    expect(spinner.succeed).toHaveBeenCalledWith(expect.stringContaining('0 domains'));
  });

  it('reports failures for non-success non-422 responses', async () => {
    const config: MastodontConfig = { ...baseConfig, blocklist: '/path/to/blocklist.txt' };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(500, { error: 'server error' }) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('bad.example\n' as never);

    await setBlocks(config);

    expect(spinner.warn).toHaveBeenCalledWith(expect.stringContaining('0 succeeded, 1 failed'));
  });

  it('sets reject_media and reject_reports when severity is not suspend', async () => {
    const config: MastodontConfig = {
      ...baseConfig,
      blocklist: '/path/to/blocklist.txt',
      severity: 'silence',
      rejectMedia: true,
      rejectReports: true,
    };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('domain.example\n' as never);

    await setBlocks(config);

    const postCalls = callsByMethod('POST');
    expect(postCalls).toHaveLength(1);
    const body = new URLSearchParams(postCalls[0]![1]!.body as string);
    expect(body.get('reject_media')).toBe('true');
    expect(body.get('reject_reports')).toBe('true');
  });

  it('does NOT set reject_media or reject_reports when severity is suspend', async () => {
    const config: MastodontConfig = {
      ...baseConfig,
      blocklist: '/path/to/blocklist.txt',
      severity: 'suspend',
      rejectMedia: true,
      rejectReports: true,
    };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('domain.example\n' as never);

    await setBlocks(config);

    const postCalls = callsByMethod('POST');
    expect(postCalls).toHaveLength(1);
    const body = new URLSearchParams(postCalls[0]![1]!.body as string);
    expect(body.get('reject_media')).toBeNull();
    expect(body.get('reject_reports')).toBeNull();
  });

  it('sets private_comment and public_comment when provided in config', async () => {
    const config: MastodontConfig = {
      ...baseConfig,
      blocklist: '/path/to/blocklist.txt',
      privateComment: 'Internal note',
      publicComment: 'Public reason',
    };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('comment.example\n' as never);

    await setBlocks(config);

    const postCalls = callsByMethod('POST');
    expect(postCalls).toHaveLength(1);
    const body = new URLSearchParams(postCalls[0]![1]!.body as string);
    expect(body.get('private_comment')).toBe('[import-mastodont] Internal note');
    expect(body.get('public_comment')).toBe('Public reason');
  });

  it('sets private_comment to [import-mastodont] when no privateComment provided', async () => {
    const config: MastodontConfig = {
      ...baseConfig,
      blocklist: '/path/to/blocklist.txt',
    };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('marker.example\n' as never);

    await setBlocks(config);

    const postCalls = callsByMethod('POST');
    expect(postCalls).toHaveLength(1);
    const body = new URLSearchParams(postCalls[0]![1]!.body as string);
    expect(body.get('private_comment')).toBe('[import-mastodont]');
  });

  it('skips domains present in the allowlist when adding blocks', async () => {
    const config: MastodontConfig = {
      ...baseConfig,
      blocklist: '/path/to/blocklist.txt',
      allowlist: '/path/to/allowlist.txt',
    };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile
      .mockResolvedValueOnce('blocked.example\nallowed.example\n' as never)
      .mockResolvedValueOnce('allowed.example\n' as never);

    await setBlocks(config);

    const postCalls = callsByMethod('POST');
    expect(postCalls).toHaveLength(1);
    const body = new URLSearchParams(postCalls[0]![1]!.body as string);
    expect(body.get('domain')).toBe('blocked.example');
  });
});

describe('loadDomainList', () => {
  it('loads domains from a newline-separated .txt file', async () => {
    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('evil.example\nspam.example\n' as never);

    const domains = await loadDomainList('/path/to/list.txt');

    expect(domains).toEqual(['evil.example', 'spam.example']);
  });

  it('loads domains from a JSON array file', async () => {
    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('["json.example", "another.example"]' as never);

    const domains = await loadDomainList('/path/to/list.json');

    expect(domains).toEqual(['json.example', 'another.example']);
  });

  it('loads first-column domains from a CSV file', async () => {
    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('domain,reason\ncsv.example,spam\nother.example,abuse\n' as never);

    const domains = await loadDomainList('/path/to/list.csv');

    expect(domains).toEqual(['csv.example', 'other.example']);
  });

  it('strips a CSV header row when first cell is "domain"', async () => {
    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('domain,notes\ncsv.example,spam\n' as never);

    const domains = await loadDomainList('/path/to/list.csv');

    expect(domains).not.toContain('domain');
    expect(domains).toEqual(['csv.example']);
  });

  it('fetches a remote URL and parses the result as a txt list', async () => {
    mockIsUrl.mockReturnValue(true);
    mockFetch.mockResolvedValueOnce(createMockResponse(200, 'remote.example\nother.example\n') as never);

    const domains = await loadDomainList('https://lists.example/domains.txt');

    expect(domains).toEqual(['remote.example', 'other.example']);
  });

  it('filters out empty lines and whitespace-only entries', async () => {
    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('good.example\n\n   \nbad.example\n' as never);

    const domains = await loadDomainList('/path/to/list.txt');

    expect(domains).toEqual(['good.example', 'bad.example']);
  });
});

describe('removeBlocks', () => {
  it('calls process.exit(1) when no allowlist is specified', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(200, [], null) as never);

    await expect(removeBlocks(baseConfig)).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('sends DELETE requests for domains that match existing blocks', async () => {
    const config: MastodontConfig = { ...baseConfig, allowlist: '/path/to/removals.txt' };
    const existingBlocks = [
      { ...createBlock('remove.example'), id: '42' },
      { ...createBlock('keep.example'), id: '99' },
    ];

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, existingBlocks, null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('remove.example\n' as never);

    await removeBlocks(config);

    const deleteCalls = callsByMethod('DELETE');
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]![0]).toBe('https://mastodon.example/api/v1/admin/domain_blocks/42');
  });

  it('sends no DELETE requests when no allowlist domains match current blocks', async () => {
    const config: MastodontConfig = { ...baseConfig, allowlist: '/path/to/removals.txt' };

    mockFetch.mockResolvedValueOnce(createMockResponse(200, [createBlock('unrelated.example')], null) as never);
    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('notblocked.example\n' as never);

    await removeBlocks(config);

    expect(callsByMethod('DELETE')).toHaveLength(0);
  });

  it('reports the count of successfully removed blocks', async () => {
    const config: MastodontConfig = { ...baseConfig, allowlist: '/path/to/removals.txt' };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [{ ...createBlock('a.example'), id: '1' }], null) as never)
      .mockResolvedValue(createMockResponse(200, {}) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('a.example\n' as never);

    await removeBlocks(config);

    expect(spinner.succeed).toHaveBeenCalledWith(expect.stringContaining('1'));
  });

  it('reports failures when DELETE requests return non-success status', async () => {
    const config: MastodontConfig = { ...baseConfig, allowlist: '/path/to/removals.txt' };

    mockFetch
      .mockResolvedValueOnce(createMockResponse(200, [{ ...createBlock('bad.example'), id: '77' }], null) as never)
      .mockResolvedValue(createMockResponse(500, { error: 'server error' }) as never);

    mockIsUrl.mockReturnValue(false);
    mockReadFile.mockResolvedValueOnce('bad.example\n' as never);

    await removeBlocks(config);

    expect(spinner.warn).toHaveBeenCalledWith(expect.stringContaining('failed'));
  });
});
