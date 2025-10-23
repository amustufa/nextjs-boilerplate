import { defineRequest, HttpRequest } from '@/core/http/request';
import { z } from 'zod';

const RequestUploadReq = defineRequest({
  body: z.object({
    filename: z.string().min(1),
    contentType: z.string().optional(),
    size: z.number().int().positive().optional(),
    ns: z.string().min(1).default('uploads'),
    acl: z.enum(['public', 'private']).default('private'),
  }),
  query: z.object({}),
  params: z.object({}),
});

export const POST = HttpRequest(RequestUploadReq)({ auth: true }, async function () {
  const { body } = this.validate();
  const payload = {
    filename: body.filename,
    ns: body.ns,
    acl: body.acl,
    ...(body.contentType ? { contentType: body.contentType } : {}),
    ...(typeof body.size === 'number' ? { size: body.size } : {}),
  };
  const res = await this.services.files!.service.requestUpload(payload);
  return res;
});
