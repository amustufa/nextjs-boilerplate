import { describe, it, expect } from 'vitest';
import { etagFor, handleConditionalGet } from '@/core/http/etag';

describe('etag', () => {
  it('generates weak etag and 304 handling', async () => {
    const body = { a: 1, b: 'x' };
    const etag = etagFor(body);
    expect(etag.startsWith('W/"')).toBe(true);
    const req = new Request('http://x', { headers: { 'if-none-match': etag } });
    const res = handleConditionalGet(req, etag);
    expect(res.notModified).toBe(true);
    expect(res.response?.status).toBe(304);
  });
});
