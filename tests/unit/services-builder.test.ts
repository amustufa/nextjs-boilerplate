import { describe, it, expect } from 'vitest';
import { createServices, type BuilderFn } from '@/core/services';

describe('services builder', () => {
  it('sets services and namespaces', async () => {
    const steps: BuilderFn[] = [
      (b) => b.set('logger', () => ({ info() {}, error() {}, warn() {}, debug() {} })),
      (b) =>
        b.namespace('users', (ns) => {
          ns.set('util', () => ({ hello: () => 'world' }));
        }),
    ];
    const s = await createServices(steps);
    // @ts-expect-error - index signature
    expect(s.users?.util.hello()).toBe('world');
  });
});
