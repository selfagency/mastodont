import { expect } from 'vitest';

export function findCallByMethod(mockFetch: any, method: string) {
  return mockFetch.mock.calls.find((c: any) => c[1]?.method === method);
}

export function assertPostCall(
  mockFetch: any,
  expected: { url: string; auth: string; params: Record<string, string> },
) {
  const call = findCallByMethod(mockFetch, 'POST');
  expect(call).toBeDefined();
  const [url, options] = call as any;
  expect(url).toBe(expected.url);
  expect(options.headers.Authorization).toBe(expected.auth);
  expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  const params = new URLSearchParams(options.body as any);
  for (const [k, v] of Object.entries(expected.params)) {
    expect(params.get(k)).toBe(v);
  }
}

export function assertPatchCall(
  mockFetch: any,
  expected: { url: string; auth: string; params?: Record<string, string> },
) {
  const call = findCallByMethod(mockFetch, 'PATCH');
  expect(call).toBeDefined();
  const [url, options] = call as any;
  expect(url).toBe(expected.url);
  expect(options.headers.Authorization).toBe(expected.auth);
  if (expected.params) {
    const params = new URLSearchParams(options.body as any);
    for (const [k, v] of Object.entries(expected.params)) {
      expect(params.get(k)).toBe(v);
    }
  }
}
