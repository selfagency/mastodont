import { describe, it, expect } from 'vitest';
import { header } from '../header.js';

describe('header', () => {
  it('should be a non-empty string', () => {
    expect(header).toBeDefined();
    expect(typeof header).toBe('string');
    expect(header.length).toBeGreaterThan(0);
  });

  it('should contain @selfagency', () => {
    expect(header).toContain('@selfagency');
  });

  it('should contain Blocklist importer', () => {
    expect(header).toContain('Blocklist importer');
  });
});
