import type { Module } from '@/core/module';
import type { ServicesBuilder } from '@/core/services';
import { UsersService } from './domain/users.service';
import { registerUserEvents } from './events/onUserCreated';
import { registerJobProcessors } from './jobs/syncProfile.job';

export const UsersModule: Module = {
  name: 'users',
  register(services: ServicesBuilder) {
    services.namespace('users', (ns) => {
      ns.set('service', (s) => new UsersService(s.db, s.cache));
    });
  },
  async boot({
    services,
  }: {
    services: Promise<import('@/core/services').Services>;
  }): Promise<void> {
    const s = await services;
    registerUserEvents(s);
    registerJobProcessors(s);
  },
};

export default UsersModule;
