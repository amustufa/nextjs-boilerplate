import type { FC } from 'react';

type Props = {
  onSubmitAction: (formData: FormData) => Promise<unknown>;
  submitLabel?: string;
};

export const UserForm: FC<Props> = ({ onSubmitAction, submitLabel = 'Create' }) => {
  return (
    <form action={onSubmitAction} className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="w-full rounded border px-3 py-2"
          placeholder="jane@example.com"
          required
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium mb-1" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className="w-full rounded border px-3 py-2"
          placeholder="Jane Doe"
          required
        />
      </div>
      <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2">
        {submitLabel}
      </button>
    </form>
  );
};

export default UserForm;
