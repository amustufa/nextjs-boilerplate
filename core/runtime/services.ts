import { createServices, type BuilderFn, type Services } from '@/core/services';
import { getPrisma } from '@/core/db/prisma';
import { createCache } from '@/core/cache/adapter';
import { createLogger } from '@/core/logger/adapter';
import { createEventsBus } from '@/core/events/adapter';
import { createQueue } from '@/core/queue/adapter';
import { UsersModule } from '@/modules/users';

const globals = globalThis as unknown as {
  __services_node?: Promise<Services>;
  __services_edge?: Promise<Services>;
};

function bootstrapServices(runtime: 'node' | 'edge'): Promise<Services> {
  const steps: BuilderFn[] = [
    (b) => b.set('db', () => getPrisma(runtime)),
    (b) => b.set('cache', () => createCache()),
    (b) => b.set('logger', () => createLogger()),
    (b) => b.set('events', () => createEventsBus()),
    (b) => b.set('queue', () => createQueue()),
    UsersModule.register,
  ];
  const servicesPromise = createServices(steps);
  // After services are constructed, invoke module boot to wire events/jobs, only on node runtime.
  if (runtime === 'node') {
    void servicesPromise.then((services) => {
      return UsersModule.boot?.({ services: Promise.resolve(services) });
    });
  }
  return servicesPromise;
}

export function getServices(runtime: 'node' | 'edge' = 'node'): Promise<Services> {
  if (runtime === 'edge') {
    if (!globals.__services_edge) globals.__services_edge = bootstrapServices('edge');
    return globals.__services_edge;
  }
  if (!globals.__services_node) globals.__services_node = bootstrapServices('node');
  return globals.__services_node;
}
