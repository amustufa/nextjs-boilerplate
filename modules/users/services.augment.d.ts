declare global {
  interface AppServiceNamespaces {
    users: {
      service: import('./domain/services/users.service').UsersService;
    };
  }
}

export {};
