import { Router } from 'express';

import { queryOne } from '../db.js';
import { asyncHandler } from '../http.js';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_request, response) => {
    let database = 'offline';

    try {
      await queryOne('SELECT 1 AS ok');
      database = 'ok';
    } catch {
      database = 'offline';
    }

    response.json({
      status: 'ok',
      service: 'card-manager-api',
      environment: config.env,
      database
    });
  })
);
