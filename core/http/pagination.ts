export type PageParams = { page: number; perPage: number };
export type PageMeta = { page: number; perPage: number; total: number; totalPages: number };
export const pageMeta = (page: number, perPage: number, total: number): PageMeta => ({
  page,
  perPage,
  total,
  totalPages: Math.max(1, Math.ceil(total / Math.max(1, perPage))),
});
