import { FastifySchema } from 'fastify'

export const databaseInfoSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['online', 'offline'],
      description: 'Database connection status'
    },
    provider: {
      type: 'string',
      description: 'Database provider'
    },
    responseTime: {
      type: 'string',
      description: 'Database response time'
    }
  },
  required: ['status', 'provider'],
  additionalProperties: false
}

export const healthResponseSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['ok'],
      description: 'Overall application status'
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Check timestamp'
    },
    uptime: {
      type: 'number',
      description: 'Application uptime in seconds'
    },
    environment: {
      type: 'string',
      enum: ['development', 'test', 'production'],
      description: 'Application environment'
    },
    version: {
      type: 'string',
      description: 'Application version'
    },
    database: databaseInfoSchema
  },
  required: ['status', 'timestamp', 'uptime', 'environment', 'version', 'database'],
  additionalProperties: false
}

export const healthSchema: FastifySchema = {
  description: 'Check application and database health status',
  tags: ['Health'],
  summary: 'Health Check',
  response: {
    200: {
      description: 'Health status returned successfully',
      ...healthResponseSchema
    }
  }
}
