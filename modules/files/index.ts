import type { Module } from '@/core/module';
import type { ServicesBuilder } from '@/core/services';
import { FilesService } from './domain/services/files.service';

export const FilesModule: Module = {
  name: 'files',
  register(services: ServicesBuilder) {
    services.namespace('files', (ns) => {
      ns.set('service', (s) => new FilesService(s));
    });
  },
};

export default FilesModule;
export type {
  RequestUploadInput,
  RequestUploadResult,
  ConfirmUploadInput,
  ConfirmUploadResult,
} from './domain/services/files.service';
