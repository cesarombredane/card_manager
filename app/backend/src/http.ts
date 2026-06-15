import type { NextFunction, Request, RequestHandler, Response } from 'express';

type QueryValue = Request['query'][string];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<unknown> | unknown;

export function asyncHandler(handler: AsyncRouteHandler): RequestHandler {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

export function parseLimitOffset(query: Request['query']): { limit: number; offset: number } {
  const limit = Math.min(Number(query.limit ?? 25), 100);
  const offset = Math.max(Number(query.offset ?? 0), 0);

  return {
    limit: Number.isFinite(limit) ? limit : 25,
    offset: Number.isFinite(offset) ? offset : 0
  };
}

export function parseBoolean(value: QueryValue | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
}

function firstValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return firstValue(value[0]);
  }

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value);
}

export function isUuid(value: unknown): value is string {
  const normalizedValue = firstValue(value);
  return normalizedValue !== undefined && uuidPattern.test(normalizedValue);
}

export function parseRequiredUuid(value: unknown, fieldName = 'id'): string {
  const normalizedValue = firstValue(value);

  if (!normalizedValue || !isUuid(normalizedValue)) {
    throw new HttpError(400, `Invalid ${fieldName} UUID`);
  }

  return normalizedValue;
}

export function parseOptionalUuid(value: unknown, fieldName: string): string | null {
  const normalizedValue = firstValue(value);

  if (!normalizedValue) {
    return null;
  }

  if (!isUuid(normalizedValue)) {
    throw new HttpError(400, `Invalid ${fieldName} UUID`);
  }

  return normalizedValue;
}

export function likePattern(value: unknown): string {
  return `%${String(value ?? '').trim()}%`;
}

export function sendNotFound(response: Response, entityName: string): void {
  response.status(404).json({
    error: `${entityName} not found`
  });
}
