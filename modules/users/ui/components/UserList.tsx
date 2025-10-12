import type { FC } from 'react';

type Item = { id: string; email: string; name: string; createdAt: string | Date };

export const UserList: FC<{ items: Item[] }> = ({ items }) => {
  if (items.length === 0) return <p className="text-sm text-gray-600">No users yet.</p>;
  return (
    <ul className="divide-y rounded border">
      {items.map((u) => (
        <li key={u.id} className="p-3 flex items-center justify-between">
          <div>
            <p className="font-medium">{u.name}</p>
            <p className="text-sm text-gray-600">{u.email}</p>
          </div>
          <span className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
};

export default UserList;
