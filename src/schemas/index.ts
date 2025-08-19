// Schema comum para respostas de erro de autenticação
export const unauthorizedResponseSchema = {
  type: 'object',
  properties: {
    statusCode: {
      type: 'number',
      description: 'HTTP status code',
      example: 401,
    },
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
      example: false,
    },
    error: {
      type: 'string',
      description: 'Error type',
      example: 'Unauthorized',
    },
    message: {
      type: 'string',
      description: 'Descriptive error message',
      example: 'Authentication required',
    },
  },
  required: ['statusCode', 'success', 'error', 'message'],
  additionalProperties: false,
}

// Schema comum para respostas de erro de validação
export const validationErrorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: {
      type: 'number',
      description: 'HTTP status code',
      example: 400,
    },
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
      example: false,
    },
    error: {
      type: 'string',
      description: 'Error type',
      example: 'Validation Error',
    },
    message: {
      type: 'string',
      description: 'Descriptive error message',
    },
    details: {
      type: 'array',
      description: 'Validation error details',
      items: {
        type: 'object',
      },
    },
  },
  required: ['statusCode', 'success', 'error', 'message'],
  additionalProperties: false,
}

// Schema comum para respostas de erro interno
export const internalErrorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: {
      type: 'number',
      description: 'HTTP status code',
      example: 500,
    },
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
      example: false,
    },
    error: {
      type: 'string',
      description: 'Error type',
      example: 'Internal Server Error',
    },
    message: {
      type: 'string',
      description: 'Descriptive error message',
    },
  },
  required: ['statusCode', 'success', 'error', 'message'],
  additionalProperties: false,
}

// Schema comum para respostas de sucesso
export const successResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
      example: true,
    },
  },
  required: ['success'],
  additionalProperties: true,
}

export const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: {
      type: 'number',
      description: 'HTTP status code',
    },
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    error: {
      type: 'string',
      description: 'Error type',
    },
    message: {
      type: 'string',
      description: 'Descriptive error message',
    },
  },
  required: ['statusCode', 'success', 'error', 'message'],
  additionalProperties: false,
}

export * from './campaigns.js'
export * from './rules.js'
export * from './health.js'
