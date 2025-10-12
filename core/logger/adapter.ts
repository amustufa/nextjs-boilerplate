import pino from 'pino';
import type { Logger } from '@/core/services';

export function createLogger(): Logger {
  const redactions = ['password', 'secret', 'token', 'key', 'auth', 'cookie'];
  const logger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: { paths: redactions, remove: true },
  });
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;
  const logObj = (lvl: 'info' | 'error' | 'warn' | 'debug', o: unknown, msg?: string) => {
    if (typeof o === 'string' && msg === undefined) {
      logger[lvl](o);
    } else if (isRecord(o)) {
      logger[lvl](o, msg);
    } else {
      logger[lvl]({ value: o }, msg);
    }
  };
  return {
    info(o: unknown, msg?: string) {
      logObj('info', o, msg);
    },
    error(o: unknown, msg?: string) {
      logObj('error', o, msg);
    },
    warn(o: unknown, msg?: string) {
      logObj('warn', o, msg);
    },
    debug(o: unknown, msg?: string) {
      logObj('debug', o, msg);
    },
  };
}
