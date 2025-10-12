declare global {
  interface AppServiceNamespaces {
    users: {
      service: import('./domain/users.service').UsersService;
    };
  }
}

export {};
