export type ErrorKind =
  | 'validation'
  | 'service'
  | 'repository'
  | 'event'
  | 'job'
  | 'auth'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'unknown';

export class AppError extends Error {
  kind: ErrorKind;
  code: string;
  details?: unknown;
  override cause?: unknown;
  constructor(
    kind: ErrorKind,
    message: string,
    code = 'APP_ERROR',
    details?: unknown,
    cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.kind = kind;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('validation', message, 'VALIDATION_FAILED', details);
  }
}
export class ServiceError extends AppError {
  constructor(message: string, code = 'SERVICE_ERROR', details?: unknown) {
    super('service', message, code, details);
  }
}
export class RepositoryError extends AppError {
  constructor(message: string, details?: unknown) {
    super('repository', message, 'REPOSITORY_ERROR', details);
  }
}
export class EventError extends AppError {
  constructor(message: string, details?: unknown) {
    super('event', message, 'EVENT_ERROR', details);
  }
}
export class JobError extends AppError {
  constructor(message: string, details?: unknown) {
    super('job', message, 'JOB_ERROR', details);
  }
}

import { ZodError } from 'zod';
export type NormalizedError = {
  httpStatus: number;
  error: { type: string; code: string; message: string; details: unknown };
};
export function normalizeError(err: unknown): NormalizedError {
  let httpStatus = 500;
  let type = 'unknown',
    code = 'UNKNOWN',
    message = 'Unexpected error',
    details: unknown;
  if (err instanceof AppError) {
    type = err.kind;
    code = err.code;
    message = err.message;
    details = err.details;
    if (err.kind === 'validation') httpStatus = 422;
    else if (err.kind === 'auth') httpStatus = 401;
    else if (err.kind === 'not_found') httpStatus = 404;
    else if (err.kind === 'conflict') httpStatus = 409;
    else if (err.kind === 'rate_limit') httpStatus = 429;
  } else if (err instanceof ZodError) {
    httpStatus = 422;
    type = 'validation';
    code = 'VALIDATION_FAILED';
    message = 'Validation failed';
    details = err.issues;
  } else if (err instanceof Error) {
    message = err.message;
  }
  return { httpStatus, error: { type, code, message, details } } as const;
}
