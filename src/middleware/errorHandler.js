import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  console.error('[Error Handled]:', err.message || err);

  const status = err.status || 500;
  const response = {
    error: err.message || 'Internal Server Error',
  };

  if (config.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}