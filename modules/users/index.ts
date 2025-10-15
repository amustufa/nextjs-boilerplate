import type { Module } from '@/core/module';
import type { ServicesBuilder } from '@/core/services';
import { UsersService } from './domain/services/users.service';
import { registerUserEvents } from './events/onUserCreated';
import { registerJobProcessors, registerExampleScheduler } from './jobs/syncProfile.job';

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
    await registerExampleScheduler(s);
  },
};

export default UsersModule;
