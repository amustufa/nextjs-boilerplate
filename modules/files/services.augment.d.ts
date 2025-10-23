declare global {
  interface AppServiceNamespaces {
    files: {
      service: import('./domain/services/files.service').FilesService;
    };
  }
}

export {};
