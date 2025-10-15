export type Result<TOk extends object = {}, TErr extends object = {}> =
  | ({ ok: true } & TOk)
  | ({ ok: false } & TErr);
