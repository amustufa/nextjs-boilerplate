import { UploadClient } from './UploadClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function FilesDemoPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Files Demo</h1>
      <p className="text-sm text-gray-600">
        Demonstrates presigned and direct uploads using the storage service.
      </p>
      <UploadClient />
    </div>
  );
}
