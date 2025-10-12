import Link from 'next/link';

export const runtime = 'nodejs';

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-xl w-full p-8 rounded-lg border bg-white shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Welcome</h1>
        <p className="text-sm text-gray-600 mb-6">
          This boilerplate is organized by modules. Jump into a module to see API handlers,
          events/jobs, and example UI.
        </p>
        <div className="space-y-3">
          <Link
            href="/users"
            className="block w-full rounded-md border px-4 py-3 hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Users</span>
              <span className="text-xs text-gray-500">/users</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Sample module route group page.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
