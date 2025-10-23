import { defineRequest, HttpRequest } from '@/core/http/request';
import { z } from 'zod';

const DirectUploadReq = defineRequest({
  body: z.object({
    ns: z.string().min(1).default('uploads'),
    filename: z.string().min(1),
    contentType: z.string().optional(),
    base64: z.string().min(1),
  }),
  query: z.object({}),
  params: z.object({}),
});

export const POST = HttpRequest(DirectUploadReq)({ auth: true }, async function () {
  const { body } = this.validate();
  const res = await this.services.files!.service.writeBase64(
    body.ns,
    body.filename,
    body.base64,
    body.contentType,
  );
  return res;
});
