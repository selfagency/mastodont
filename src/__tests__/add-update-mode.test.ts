import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createTempFileWithContent, cleanupTempDir } from './test-utils.js';

// Mock node-fetch and then import the mocked fetch for assertions. The vi.mock
// call is hoisted by Vitest so it must not reference top-level variables.
vi.mock('node-fetch', () => ({ default: vi.fn() }));
import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

import * as blocks from '../blocks.js';

describe('add update mode: domain_blocks integration', () => {
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

  it('PATCHes existing blocks when update=true', async () => {
    // Arrange: initial GET returns one existing block with id '42'
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([{ id: '42', domain: 'example.com' }]),
      text: () => Promise.resolve(JSON.stringify([{ id: '42', domain: 'example.com' }])),
      headers: { get: (_: string) => null },
    } as any);

    ({ tmpDir, tmpFile } = await createTempFileWithContent('example.com\n'));

    // PATCH response
    mockFetch.mockResolvedValue({ status: 200 } as any);

    const config = {
      endpoint: 'http://example.test',
      accessToken: 'token',
      blocklist: tmpFile,
      update: true,
      severity: 'suspend', // ensure skip of reject_media/reject_reports branch
      obfuscate: false,
      privateComment: '',
    } as any;

    // Act
    await blocks.setBlocks(config);

    // Assert: find a PATCH call to the specific block id
    const patchCall = mockFetch.mock.calls.find((c: any) => c[1]?.method === 'PATCH');
    expect(patchCall).toBeDefined();

    const [url, options] = patchCall as any;
    expect(url).toBe('http://example.test/api/v1/admin/domain_blocks/42');
    expect(options.headers.Authorization).toBe('Bearer token');
    const params = new URLSearchParams(options.body);
    expect(params.get('domain')).toBe('example.com');
    // severity should be 'suspend' per config
    expect(params.get('severity')).toBe('suspend');
  });
});
