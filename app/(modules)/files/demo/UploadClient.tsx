'use client';

import { useState } from 'react';
import { z } from 'zod';

async function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(String(fr.result).split(',')[1] ?? '');
    fr.readAsDataURL(file);
  });
}

export function UploadClient(): JSX.Element {
  const [log, setLog] = useState<string>('');
  const append = (line: string) => setLog((s) => s + (s ? '\n' : '') + line);

  const onPresigned = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem('file') as HTMLInputElement) ?? null;
    const file = input?.files?.[0];
    if (!file) return;
    append(
      `Requesting upload session for ${file.name} (${file.type || 'application/octet-stream'})`,
    );
    const res = await fetch('/files/uploads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        acl: 'private',
      }),
    });
    const SessionSchema = z.union([
      z.object({
        mode: z.literal('presigned'),
        key: z.string(),
        url: z.string().url(),
        headers: z.record(z.string()).optional(),
        expiresAt: z.string(),
      }),
      z.object({ mode: z.literal('server'), key: z.string() }),
    ]);
    const session = SessionSchema.parse(await res.json());
    if (session.mode === 'presigned') {
      append(`Uploading to presigned URL...`);
      const put = await fetch(session.url, {
        method: 'PUT',
        headers: session.headers ?? {},
        body: file,
      });
      append(`PUT status: ${put.status}`);
      const confirm = await fetch('/files/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: session.key, size: file.size }),
      });
      append(`Confirm status: ${confirm.status}`);
      const metaRes = await fetch(`/files/by-key?key=${encodeURIComponent(session.key)}`);
      const MetaSchema = z.object({ url: z.string().url().nullable() }).passthrough();
      const meta = MetaSchema.parse(await metaRes.json());
      append(`File URL: ${meta.url ?? '(private or no URL)'}`);
    } else {
      append(`Adapter has no presign; try direct upload below.`);
    }
  };

  const onDirect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem('file2') as HTMLInputElement) ?? null;
    const file = input?.files?.[0];
    if (!file) return;
    append(`Direct upload (base64) for ${file.name}`);
    const base64 = await readAsBase64(file);
    const post = await fetch('/files/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ns: 'uploads',
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        base64,
      }),
    });
    const KeySchema = z.object({ key: z.string() });
    const { key } = KeySchema.parse(await post.json());
    // Confirm to persist metadata in DB
    await fetch('/files/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, size: file.size }),
    });
    const metaRes = await fetch(`/files/by-key?key=${encodeURIComponent(key)}`);
    const MetaSchema = z.object({ url: z.string().url().nullable() }).passthrough();
    const meta = MetaSchema.parse(await metaRes.json());
    append(`Direct file URL: ${meta.url ?? '(private or no URL)'}`);
  };

  return (
    <div className="space-y-6">
      <div className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Presigned Upload</h2>
        <form onSubmit={onPresigned} className="flex items-center gap-3">
          <input name="file" type="file" />
          <button className="px-3 py-2 border rounded" type="submit">
            Upload
          </button>
        </form>
      </div>
      <div className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Direct Upload (Base64)</h2>
        <form onSubmit={onDirect} className="flex items-center gap-3">
          <input name="file2" type="file" />
          <button className="px-3 py-2 border rounded" type="submit">
            Upload
          </button>
        </form>
      </div>
      <pre className="text-xs bg-gray-50 p-3 rounded whitespace-pre-wrap">{log}</pre>
    </div>
  );
}
