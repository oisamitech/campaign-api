import { FastifySchema } from 'fastify'

export const databaseInfoSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['online', 'offline'],
      description: 'Database connection status',
    },
    provider: {
      type: 'string',
      description: 'Database provider',
    },
    responseTime: {
      type: 'string',
      description: 'Database response time',
    },
  },
  required: ['status', 'provider'],
  additionalProperties: false,
}

export const healthResponseSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['ok'],
      description: 'Overall application status',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Check timestamp',
    },
    uptime: {
      type: 'number',
      description: 'Application uptime in seconds',
    },
    environment: {
      type: 'string',
      enum: ['development', 'test', 'production'],
      description: 'Application environment',
    },
    version: {
      type: 'string',
      description: 'Application version',
    },
    database: databaseInfoSchema,
  },
  required: [
    'status',
    'timestamp',
    'uptime',
    'environment',
    'version',
    'database',
  ],
  additionalProperties: false,
}

export const healthSchema: FastifySchema = {
  description: 'Check application and database health status',
  tags: ['Health'],
  summary: 'Health Check',
  security: [], // Health check não requer autenticação
  response: {
    200: {
      description: 'Health status returned successfully',
      ...healthResponseSchema,
    },
    500: {
      description: 'Internal server error',
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
          description: 'Error message',
        },
      },
      required: ['statusCode', 'success', 'error', 'message'],
    },
  },
}
