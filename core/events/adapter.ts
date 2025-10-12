import { EventEmitter } from 'node:events';
import type { Events } from '@/core/services';

export function createEventsBus(): Events {
  const ee = new EventEmitter();
  return {
    on<T = unknown>(type: string, fn: (p: T) => void | Promise<void>) {
      ee.on(type, (payload: unknown) => {
        void (fn as (p: unknown) => void | Promise<void>)(payload);
      });
    },
    emit<T = unknown>(type: string, payload: T) {
      ee.emit(type, payload);
    },
  };
}
