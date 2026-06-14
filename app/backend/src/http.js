export function asyncHandler(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

export function parseLimitOffset(query) {
  const limit = Math.min(Number(query.limit ?? 25), 100);
  const offset = Math.max(Number(query.offset ?? 0), 0);

  return {
    limit: Number.isFinite(limit) ? limit : 25,
    offset: Number.isFinite(offset) ? offset : 0
  };
}

export function parseBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  return ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
}

export function likePattern(value) {
  return `%${String(value ?? '').trim()}%`;
}

export function sendNotFound(response, entityName) {
  response.status(404).json({
    error: `${entityName} not found`
  });
}
