import { expect, it, vi } from 'vitest';

// Mock csvtojson before importing the module under test so the import uses the mock
vi.mock('csvtojson', () => ({
  default: () => ({
    fromString: (_: string) => Promise.resolve([{ weird: 'x.com' }, { weird: 'y.com' }]),
  }),
}));

vi.mock('fs/promises', () => ({ readFile: vi.fn(() => Promise.resolve('ignored')) }));
vi.mock('is-url-superb', () => ({ default: () => false }));

it('uses first column from csvtojson records when domain key missing', async () => {
  const { loadDomainList } = await import('../blocks.js');
  const out = await loadDomainList('/tmp/list.csv');
  expect(out).toEqual(['x.com', 'y.com']);
});
