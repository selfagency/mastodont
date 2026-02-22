import { expect, it, vi } from 'vitest';

// Separate test file to avoid interfering with other module mocks
vi.mock('csvtojson', () => ({
  default: () => ({ fromString: (_: string) => Promise.resolve([{}]) }),
}));
vi.mock('fs/promises', () => ({ readFile: vi.fn(() => Promise.resolve('ignored')) }));
vi.mock('is-url-superb', () => ({ default: () => false }));

it('handles csvtojson records with no keys (returns empty array)', async () => {
  const { loadDomainList } = await import('../blocks.js');
  const out = await loadDomainList('/tmp/empty.csv');
  expect(out).toEqual([]);
});
