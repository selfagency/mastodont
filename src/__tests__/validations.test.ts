import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node-fetch', () => ({ default: vi.fn() }));
vi.mock('is-url-superb', () => ({ default: vi.fn() }));
vi.mock('ora', () => {
  const spinner = { start: vi.fn(), succeed: vi.fn(), fail: vi.fn() };
  spinner.start.mockReturnValue(spinner);
  return { default: vi.fn(() => spinner) };
});
vi.mock('consola', () => ({
  consola: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() },
}));
vi.mock('../blocks.js', () => ({ __esModule: true, getBlocks: vi.fn() }));

import isUrl from 'is-url-superb';
import fetch from 'node-fetch';

let validateEndpoint: any;
let validateCredentials: any;
let mockGetBlocks: any;

const mockFetch = vi.mocked(fetch);
const mockIsUrl = vi.mocked(isUrl);

beforeAll(async () => {
  const mods = await Promise.all([import('../blocks.js'), import('../validations.js')]);
  // set validateEndpoint for the validateEndpoint tests
  validateEndpoint = mods[1].validateEndpoint;
  // prepare getBlocks mock reference
  mockGetBlocks = vi.mocked(mods[0].getBlocks);
});

const createMockResponse = (status: number, body: unknown) => ({
  status,
  json: () => Promise.resolve(body),
});

const baseConfig = { endpoint: 'https://mastodon.social', accessToken: 'test-token' };

describe('validateEndpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsUrl.mockReturnValue(true);
  });

  it('succeeds with a valid v4+ endpoint', async () => {
    const instance = { version: '4.1.0', domain: 'mastodon.social' };
    mockFetch.mockResolvedValue(createMockResponse(200, instance) as never);

    const result = await validateEndpoint(baseConfig);

    expect(result).toEqual(instance);
  });

  it('throws when the URL is invalid', async () => {
    mockIsUrl.mockReturnValue(false);

    await expect(validateEndpoint({ ...baseConfig, endpoint: 'not-a-url' })).rejects.toThrow(
      'Mastodon server URL is invalid.',
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws when fetch returns a non-200 status', async () => {
    mockFetch.mockResolvedValue(createMockResponse(404, {}) as never);

    await expect(validateEndpoint(baseConfig)).rejects.toThrow('Mastodon server URL is invalid.');
  });

  it('throws when the Mastodon version is less than 4', async () => {
    const instance = { version: '3.5.0', domain: 'mastodon.social' };
    mockFetch.mockResolvedValue(createMockResponse(200, instance) as never);

    await expect(validateEndpoint(baseConfig)).rejects.toThrow('Mastodon version 4 or higher required.');
  });

  it('throws when the version field is missing or produces NaN', async () => {
    const instance = { domain: 'mastodon.social' };
    mockFetch.mockResolvedValue(createMockResponse(200, instance) as never);

    await expect(validateEndpoint(baseConfig)).rejects.toThrow('Mastodon version 4 or higher required.');
  });

  it('returns the instance object on success', async () => {
    const instance = { version: '4.2.0', domain: 'mastodon.social', title: 'Mastodon' };
    mockFetch.mockResolvedValue(createMockResponse(200, instance) as never);

    const result = await validateEndpoint(baseConfig);

    expect(result).toEqual(instance);
  });
});

describe('validateCredentials', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsUrl.mockReturnValue(true);
    // import the mocked getBlocks and validations dynamically to ensure vitest mock factories are applied
    const mods = await Promise.all([import('../blocks.js'), import('../validations.js')]);
    mockGetBlocks = vi.mocked(mods[0].getBlocks);
    validateEndpoint = mods[1].validateEndpoint;
    validateCredentials = mods[1].validateCredentials;
  });

  it('succeeds when getBlocks resolves', async () => {
    mockGetBlocks.mockResolvedValue([] as never);

    await expect(validateCredentials(baseConfig)).resolves.toBeUndefined();
    expect(mockGetBlocks).toHaveBeenCalledWith(baseConfig, true);
  });

  it('throws with an auth error message when getBlocks rejects', async () => {
    mockGetBlocks.mockRejectedValue(new Error('Unauthorized') as never);

    await expect(validateCredentials(baseConfig)).rejects.toThrow(
      'Failed to authenticate to API. Access token is likely invalid.',
    );
  });
});
