import { config } from '../config/env.js';

export function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing API Key',
    });
  }

  next();
}
