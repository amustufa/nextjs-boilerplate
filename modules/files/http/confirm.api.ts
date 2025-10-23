import { defineRequest, HttpRequest } from '@/core/http/request';
import { z } from 'zod';

const ConfirmUploadReq = defineRequest({
  body: z.object({
    key: z.string().min(1),
    size: z.number().int().positive().optional(),
    checksum: z.string().optional(),
  }),
  query: z.object({}),
  params: z.object({}),
});

export const POST = HttpRequest(ConfirmUploadReq)({ auth: true }, async function () {
  const { body } = this.validate();
  const payload = {
    key: body.key,
    ...(typeof body.size === 'number' ? { size: body.size } : {}),
    ...(body.checksum ? { checksum: body.checksum } : {}),
  };
  const res = await this.services.files!.service.confirmUpload(payload);
  return res;
});
