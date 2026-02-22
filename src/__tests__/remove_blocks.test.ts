import fs from 'fs/promises';
import fetch from 'node-fetch';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupTempDir, createTempFileWithContent } from './test-utils.js';
const mockFetch = vi.mocked(fetch as any);

import * as blocks from '../blocks.js';
import { findCallByMethod } from './blocks-test-helpers.js';

// Mock node-fetch (hoisted by Vitest in other files)
vi.mock('node-fetch', () => ({ default: vi.fn() }));

describe('removeBlocks: domain block removals', () => {
  let tmpFile = '';
  let tmpDir = '';

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tmpFile) await fs.unlink(tmpFile).catch(() => {});
    await cleanupTempDir(tmpDir);
    mockFetch.mockReset();
  });

  it('sends DELETE requests for matching blocks', async () => {
    // Arrange: getBlocks returns one current block
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([{ id: '99', domain: 'remove.com' }]),
      text: () => Promise.resolve(JSON.stringify([{ id: '99', domain: 'remove.com' }])),
      headers: { get: (_: string) => null },
    } as any);

    ({ tmpDir, tmpFile } = await createTempFileWithContent('remove.com\n'));

    // DELETE response
    mockFetch.mockResolvedValue({ status: 200 } as any);

    const config = {
      endpoint: 'http://example.test',
      accessToken: 'token',
      allowlist: tmpFile,
    } as any;

    // Act
    await blocks.removeBlocks(config);

    // Assert: find a DELETE call to the specific block id
    const delCall = findCallByMethod(mockFetch, 'DELETE');
    expect(delCall).toBeDefined();
    const [url, options] = delCall as any;
    expect(url).toBe('http://example.test/api/v1/admin/domain_blocks/99');
    expect(options.headers.Authorization).toBe('Bearer token');
  });

  it('no-ops when there are no matching blocks', async () => {
    // Arrange: getBlocks returns empty
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
      headers: { get: (_: string) => null },
    } as any);

    ({ tmpDir, tmpFile } = await createTempFileWithContent('nope.com\n'));

    const config = {
      endpoint: 'http://example.test',
      accessToken: 'token',
      allowlist: tmpFile,
    } as any;

    // Act
    await blocks.removeBlocks(config);

    // Assert: no DELETE calls were made
    const delCall = findCallByMethod(mockFetch, 'DELETE');
    expect(delCall).toBeUndefined();
  });
});
