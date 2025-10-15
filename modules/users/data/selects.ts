export const userListSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;

// Derive row type using the exported model type
export type UserListRow = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};
