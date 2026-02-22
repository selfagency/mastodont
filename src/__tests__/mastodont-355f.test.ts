import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// Create a fetch mock before importing the module under test so the module
// receives the mocked fetch reference.
const mockFetch = vi.fn();
vi.mock('node-fetch', () => ({ default: mockFetch }));

import * as blocks from '../blocks.js';

describe('mastodont-355f: domain_blocks integration', () => {
  let tmpFile = '';

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tmpFile) await fs.unlink(tmpFile).catch(() => {});
    mockFetch.mockReset();
  });

  it('sends correct POST body according to Mastodon domain_blocks API', async () => {
    // Arrange: stub current blocks to be empty and create a simple blocklist file
    vi.spyOn(blocks, 'getBlocks').mockResolvedValue([] as any);

    tmpFile = path.join(os.tmpdir(), `mastodont-test-${Date.now()}.txt`);
    await fs.writeFile(tmpFile, 'example.com\n');

    mockFetch.mockResolvedValue({ status: 201 });

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

    // Assert: find a POST call and inspect the form body
    const postCall = mockFetch.mock.calls.find((c: any) => c[1]?.method === 'POST');
    expect(postCall).toBeDefined();

    const [url, options] = postCall as any;
    expect(url).toBe('http://example.test/api/v1/admin/domain_blocks');
    expect(options.headers.Authorization).toBe('Bearer token');
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    const params = new URLSearchParams(options.body);
    expect(params.get('domain')).toBe('example.com');
    expect(params.get('severity')).toBe('silence');
    expect(params.get('obfuscate')).toBe('true');
    expect(params.get('reject_media')).toBe('true');
    expect(params.get('reject_reports')).toBe('false');
    expect(params.get('private_comment')).toBe('[import-mastodont] private');
    expect(params.get('public_comment')).toBe('public');
  });
});
