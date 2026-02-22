import { describe, it, expect, vi, beforeEach } from 'vitest';
import { args } from '../args.js';

vi.mock('@thi.ng/args', () => ({
  __esModule: true,
  parse: vi.fn(),
  flag: vi.fn((opts) => opts),
  string: vi.fn((opts) => opts),
}));

vi.mock('consola', () => ({
  consola: {
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
  },
}));

describe('args', () => {
  let mockParse: any;
  let mockConsola: any;

  beforeEach(async () => {
    const { parse } = await import('@thi.ng/args');
    const { consola } = await import('consola');
    mockParse = parse;
    mockConsola = consola;
    vi.clearAllMocks();
  });

  it('should return parsed result', async () => {
    const mockResult = {
      accessToken: 'test-token',
      endpoint: 'https://example.com',
    };
    mockParse.mockReturnValue({ result: mockResult });

    const result = await args();

    expect(result).toEqual(mockResult);
  });

  it('should return undefined when parse returns no result', async () => {
    mockParse.mockReturnValue(null);

    const result = await args();

    expect(result).toBeUndefined();
  });

  it('should return undefined when parse result is undefined', async () => {
    mockParse.mockReturnValue({ result: undefined });

    const result = await args();

    expect(result).toBeUndefined();
  });

  it('should pass process.argv to parse', async () => {
    mockParse.mockReturnValue({ result: {} });

    await args();

    expect(mockParse).toHaveBeenCalledWith(expect.anything(), process.argv);
  });

  it('should log debug message with parsed arguments', async () => {
    const mockResult = { accessToken: 'token123' };
    mockParse.mockReturnValue({ result: mockResult });

    await args();

    expect(mockConsola.debug).toHaveBeenCalledWith(
      `Arguments: ${JSON.stringify(mockResult, null, 2)}`
    );
  });
});
