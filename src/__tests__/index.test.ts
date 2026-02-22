import { describe, it, expect, vi, beforeEach } from 'vitest';

// All mocks must be declared before any dynamic imports
vi.mock('consola', () => ({
  consola: { log: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('open', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../args.js', () => ({ __esModule: true, args: vi.fn() }));
vi.mock('../blocks.js', () => ({ __esModule: true, setBlocks: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../config.js', () => ({ __esModule: true,
  getConfig: vi.fn(),
  resetConfig: vi.fn().mockResolvedValue(undefined),
  setConfig: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../header.js', () => ({ __esModule: true, header: 'test-header' }));
vi.mock('../validations.js', () => ({ __esModule: true,
  validateEndpoint: vi.fn(),
  validateCredentials: vi.fn().mockResolvedValue(undefined),
}));

describe('index (main)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  const setupMocks = async (flagsValue: Record<string, unknown> | undefined) => {
    const { args } = await import('../args.js');
    const { setBlocks } = await import('../blocks.js');
    const { getConfig, resetConfig, setConfig } = await import('../config.js');
    const { validateEndpoint, validateCredentials } = await import('../validations.js');
    const { consola } = await import('consola');
    const open = (await import('open')).default;

    const mockArgs = vi.mocked(args);
    const mockSetBlocks = vi.mocked(setBlocks);
    const mockGetConfig = vi.mocked(getConfig);
    const mockResetConfig = vi.mocked(resetConfig);
    const mockSetConfig = vi.mocked(setConfig);
    const mockValidateEndpoint = vi.mocked(validateEndpoint);
    const mockValidateCredentials = vi.mocked(validateCredentials);
    const mockOpen = vi.mocked(open);
    const mockConsola = vi.mocked(consola);

    mockArgs.mockResolvedValue(flagsValue as any);

    const config = { endpoint: 'https://mastodon.social', accessToken: 'token', ...flagsValue };
    mockGetConfig.mockResolvedValue(config);
    mockValidateEndpoint.mockResolvedValue({ version: '4.1.0', domain: 'mastodon.social' } as any);
    mockValidateCredentials.mockResolvedValue(undefined);
    mockSetBlocks.mockResolvedValue(undefined);
    mockResetConfig.mockResolvedValue(undefined);
    mockSetConfig.mockResolvedValue(undefined);
    mockOpen.mockResolvedValue(undefined as any);

    return {
      mockArgs, mockSetBlocks, mockGetConfig, mockResetConfig,
      mockSetConfig, mockValidateEndpoint, mockValidateCredentials,
      mockOpen, mockConsola, config,
    };
  };

  // Helper to import index.ts and wait for main() to complete
  const runMain = async () => {
    await import('../index.js');
    // Give the async main() time to complete
    await new Promise(resolve => setTimeout(resolve, 50));
  };

  it('does nothing when args returns undefined', async () => {
    const mocks = await setupMocks(undefined);
    await runMain();
    expect(mocks.mockGetConfig).not.toHaveBeenCalled();
  });

  it('calls resetConfig when flags.reset is true', async () => {
    const mocks = await setupMocks({ reset: true });
    await runMain();
    expect(mocks.mockResetConfig).toHaveBeenCalled();
  });

  it('calls getConfig, validateEndpoint, validateCredentials in sequence', async () => {
    const mocks = await setupMocks({ endpoint: 'https://mastodon.social', accessToken: 'token' });
    await runMain();
    expect(mocks.mockGetConfig).toHaveBeenCalled();
    expect(mocks.mockValidateEndpoint).toHaveBeenCalled();
    expect(mocks.mockValidateCredentials).toHaveBeenCalled();
  });

  it('calls setConfig when instance exists and save is true', async () => {
    const mocks = await setupMocks({ save: true });
    await runMain();
    expect(mocks.mockSetConfig).toHaveBeenCalled();
  });

  it('does not call setConfig when save is false', async () => {
    const mocks = await setupMocks({ save: false });
    await runMain();
    expect(mocks.mockSetConfig).not.toHaveBeenCalled();
  });

  it('calls setBlocks', async () => {
    const mocks = await setupMocks({ endpoint: 'https://mastodon.social' });
    await runMain();
    expect(mocks.mockSetBlocks).toHaveBeenCalled();
  });

  it('opens browser when not nonInteractive', async () => {
    const mocks = await setupMocks({ endpoint: 'https://mastodon.social' });
    await runMain();
    expect(mocks.mockOpen).toHaveBeenCalledWith('https://mastodon.social/admin/instances?limited=1');
  });

  it('does not open browser when nonInteractive', async () => {
    const mocks = await setupMocks({ nonInteractive: true });
    await runMain();
    expect(mocks.mockOpen).not.toHaveBeenCalled();
  });
});
