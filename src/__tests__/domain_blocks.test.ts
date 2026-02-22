import fs from 'fs/promises';
import fetch from 'node-fetch';
import { afterEach, describe, it, vi } from 'vitest';
import { assertPostCall } from './blocks-test-helpers.js';
import { cleanupTempDir, createTempFileWithContent } from './test-utils.js';

// Mock node-fetch and then import the mocked fetch for assertions. The vi.mock
// call is hoisted by Vitest so it must not reference top-level variables.
vi.mock('node-fetch', () => ({ default: vi.fn() }));
const mockFetch = vi.mocked(fetch);

import * as blocks from '../blocks.js';

describe('domain_blocks: Mastodon domain_blocks integration', () => {
  let tmpFile = '';
  let tmpDir = '';

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tmpFile) await fs.unlink(tmpFile).catch(() => {});
    await cleanupTempDir(tmpDir);
    mockFetch.mockReset();
  });

  it('sends correct POST body according to Mastodon domain_blocks API', async () => {
    // Arrange: ensure the initial GET (getBlocks) returns 200 with an empty
    // array, then the POST call(s) return 201.
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
      headers: { get: (_: string) => null },
    } as any);

    ({ tmpDir, tmpFile } = await createTempFileWithContent('example.com\n'));

    mockFetch.mockResolvedValue({ status: 201 } as any);

    const config = {
      endpoint: 'http://example.test',
      accessToken: 'token',
      blocklist: tmpFile,
      severity: 'silence',
      obfuscate: true,
      rejectMedia: true,
      rejectReports: false,
      privateComment: 'private',
      publicComment: 'public',
    } as any;

    // Act
    await blocks.setBlocks(config);

    // Assert: POST call matches expectations
    assertPostCall(mockFetch, {
      url: 'http://example.test/api/v1/admin/domain_blocks',
      auth: 'Bearer token',
      params: {
        domain: 'example.com',
        severity: 'silence',
        obfuscate: 'true',
        reject_media: 'true',
        reject_reports: 'false',
        private_comment: '[import-mastodont] private',
        public_comment: 'public',
      },
    });
  });
});
