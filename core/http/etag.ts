// Simple deterministic ETag helper (weak ETag over JSON string)
export function etagFor(value: unknown): string {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 5381;
  for (let i = 0; i < json.length; i++) hash = (hash * 33) ^ json.charCodeAt(i);
  const hex = (hash >>> 0).toString(16);
  return `W/"${hex}"`;
}

export function handleConditionalGet(
  request: Request,
  etag: string,
): { notModified: boolean; response?: Response } {
  const inm = request.headers.get('if-none-match');
  if (inm && inm === etag) {
    return {
      notModified: true,
      response: new Response(null, { status: 304, headers: { ETag: etag } }),
    };
  }
  return { notModified: false };
}
