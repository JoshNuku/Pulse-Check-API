import Joi from 'joi';

const monitorSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[a-zA-Z0-9-_]+$/)
    .required()
    .messages({
      'string.empty': 'id is required and must be a non-empty string',
      'any.required': 'id is required and must be a non-empty string',
      'string.pattern.base': 'id can only contain alphanumeric characters, hyphens, and underscores'
    }),
  timeout: Joi.number().integer().positive().optional().messages({
    'number.base': 'timeout must be a positive integer',
    'number.integer': 'timeout must be a positive integer',
    'number.positive': 'timeout must be a positive integer'
  }),
  alert_email: Joi.string().email().required().messages({
    'string.empty': 'alert_email is required',
    'any.required': 'alert_email is required',
    'string.email': 'alert_email must be a valid email address'
  }),
  webhook_url: Joi.string().uri({ scheme: ['http', 'https'] }).optional().allow(null).messages({
    'string.uri': 'webhook_url must be a valid absolute URL',
    'string.uriCustomScheme': 'webhook_url must use HTTP or HTTPS protocol'
  }),
  backup_email: Joi.string().email().optional().allow(null).messages({
    'string.email': 'backup_email must be a valid email address'
  })
});

export function validateRegisterMonitor(req, res, next) {
  const { error } = monitorSchema.validate(req.body, { abortEarly: true });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}