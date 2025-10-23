import { defineRequest, HttpRequest } from '@/core/http/request';
import { z } from 'zod';

const GetByKeyReq = defineRequest({
  body: z.object({}),
  query: z.object({ key: z.string().min(1) }),
  params: z.object({}),
});

export const GET = HttpRequest(GetByKeyReq)({ auth: true }, async function () {
  const { query } = this.validate();
  const meta = await this.services.files!.service.getByKey(query.key);
  if (!meta) {
    return new Response(null, { status: 404 });
  }
  return meta;
});
