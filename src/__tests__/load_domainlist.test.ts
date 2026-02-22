import fs from 'fs/promises';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mockFetch = vi.mocked(fetch as any);

import { getBlocks, loadDomainList } from '../blocks.js';
import { cleanupTempDir } from './test-utils.js';

vi.mock('node-fetch', () => ({ default: vi.fn() }));

describe('loadDomainList and parseLinkHeader edge cases', () => {
  let tmpDir = '';
  let tmpFile = '';
  afterEach(async () => {
    vi.restoreAllMocks();
    if (tmpFile) await fs.unlink(tmpFile).catch(() => {});
    await cleanupTempDir(tmpDir);
    mockFetch.mockReset();
  });

  it('loads JSON list files', async () => {
    const content = JSON.stringify([' a.com ', 'b.com']);
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mastodont-test-'));
    tmpFile = path.join(tmpDir, 'list.json');
    await fs.writeFile(tmpFile, content);

    const out = await loadDomainList(tmpFile);
    expect(out).toEqual(['a.com', 'b.com']);
  });

  it('loads CSV list files and ignores header row', async () => {
    const content = 'domain,notes\nexample.com,foo\nother.com,bar\n';
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mastodont-test-'));
    tmpFile = path.join(tmpDir, 'list.csv');
    await fs.writeFile(tmpFile, content);

    const out = await loadDomainList(tmpFile);
    expect(out).toEqual(['example.com', 'other.com']);
  });

  it('loads CSV with non-domain header and uses first column', async () => {
    const content = 'host,notes\nsite.example,foo\nanother.example,bar\n';
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mastodont-test-'));
    tmpFile = path.join(tmpDir, 'list.csv');
    await fs.writeFile(tmpFile, content);

    const out = await loadDomainList(tmpFile);
    expect(out).toEqual(['site.example', 'another.example']);
  });

  it('loads CSV where domain column is not first (header-mapped)', async () => {
    const content = 'notes,domain\nfoo,example.org\nbar,another.org\n';
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mastodont-test-'));
    tmpFile = path.join(tmpDir, 'list.csv');
    await fs.writeFile(tmpFile, content);

    const out = await loadDomainList(tmpFile);
    expect(out).toEqual(['example.org', 'another.org']);
  });

  it('loads from a URL source via fetch', async () => {
    mockFetch.mockResolvedValueOnce({ text: () => Promise.resolve('u1.com\nu2.com\n') } as any);
    const out = await loadDomainList('http://example.test/list.txt');
    expect(out).toEqual(['u1.com', 'u2.com']);
  });

  it('handles malformed Link header (no <) and stops pagination', async () => {
    // First GET returns one block and malformed link header lacking '<'
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([{ id: '1', domain: 'a.com' }]),
      text: () => Promise.resolve(JSON.stringify([{ id: '1', domain: 'a.com' }])),
      headers: { get: (_: string) => 'http://bad.example/next; rel="next"' },
    } as any);

    // Second GET should not be called (or if called, return empty)
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
      headers: { get: (_: string) => null },
    } as any);

    const config = { endpoint: 'http://example.test', accessToken: 'token' } as any;
    const res = await getBlocks(config, true);
    expect(res.length).toBe(1);
  });

  it('handles malformed Link header (no >) and stops pagination', async () => {
    // First GET returns one block and malformed link header with '<' but no closing '>'
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve([{ id: '1', domain: 'a.com' }]),
      text: () => Promise.resolve(JSON.stringify([{ id: '1', domain: 'a.com' }])),
      headers: { get: (_: string) => '<http://bad.example/next; rel="next"' },
    } as any);

    const config = { endpoint: 'http://example.test', accessToken: 'token' } as any;
    const res = await getBlocks(config, true);
    expect(res.length).toBe(1);
  });

  it('strips CSV header row regardless of case', async () => {
    const content = 'Domain,notes\nCaseSite.com,foo\n';
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mastodont-test-'));
    tmpFile = path.join(tmpDir, 'list.csv');
    await fs.writeFile(tmpFile, content);

    const out = await loadDomainList(tmpFile);
    expect(out).toEqual(['CaseSite.com']);
  });
});
