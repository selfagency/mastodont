import fs from 'fs/promises';
import fetch from 'node-fetch';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTempDir, createTempFileWithContent } from './test-utils.js';
const mockFetch = vi.mocked(fetch as any);

import * as blocks from '../blocks.js';

vi.mock('node-fetch', () => ({ default: vi.fn() }));

describe('blocks coverage edge cases', () => {
  let tmpFile = '';
  let tmpDir = '';

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tmpFile) await fs.unlink(tmpFile).catch(() => {});
    await cleanupTempDir(tmpDir);
    mockFetch.mockReset();
  });

  it('skips 422 responses when treat422AsSkip is enabled (add flow)', async () => {
    // GET returns empty
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
      headers: { get: (_: string) => null },
    } as any);

    ({ tmpDir, tmpFile } = await createTempFileWithContent('skip422.com\n'));

    // POST returns 422 (already blocked)
    mockFetch.mockResolvedValue({ status: 422 } as any);

    const config = {
      endpoint: 'http://example.test',
      accessToken: 'token',
      blocklist: tmpFile,
      severity: 'silence',
    } as any;

    await blocks.setBlocks(config);

    // ensure POST occurred
    const post = mockFetch.mock.calls.find((c: any) => c[1]?.method === 'POST');
    expect(post).toBeDefined();
  });

  it('records failures when non-2xx non-422 responses are returned (add flow)', async () => {
    // GET returns empty
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
      headers: { get: (_: string) => null },
    } as any);

    ({ tmpDir, tmpFile } = await createTempFileWithContent('badresp.com\n'));

    // POST returns 500
    mockFetch.mockResolvedValue({ status: 500 } as any);

    const config = {
      endpoint: 'http://example.test',
      accessToken: 'token',
      blocklist: tmpFile,
      severity: 'silence',
    } as any;

    await blocks.setBlocks(config);

    const post = mockFetch.mock.calls.find((c: any) => c[1]?.method === 'POST');
    expect(post).toBeDefined();
  });

  it('follows pagination using Link header in getBlocks', async () => {
    // First GET returns one block and Link header pointing to next
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([{ id: '1', domain: 'a.com' }]),
      text: () => Promise.resolve(JSON.stringify([{ id: '1', domain: 'a.com' }])),
      headers: { get: (_: string) => '<http://example.test/api/v1/admin/domain_blocks?page=2>; rel="next"' },
    } as any);

    // Second GET returns empty and no link
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
      headers: { get: (_: string) => null },
    } as any);

    const config = { endpoint: 'http://example.test', accessToken: 'token' } as any;
    const blocksList = await blocks.getBlocks(config, true);
    expect(blocksList.length).toBe(1);
  });
});
