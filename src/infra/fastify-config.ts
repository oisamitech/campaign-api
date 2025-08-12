import { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import etag from '@fastify/etag'
import auth from '@fastify/auth'
import bearerAuth from '@fastify/bearer-auth'
import helmet from '@fastify/helmet'
import { env } from '../config/env.js'

export async function configureFastify(fastify: FastifyInstance) {
  await fastify.register(etag)
  await fastify.register(auth)
  await fastify.register(helmet)
  await fastify.register(cors, { origin: '*' })
  await fastify.register(bearerAuth, {
    keys: new Set(env.BEARER_AUTH_KEY?.split(',') || []),
    addHook: false,
    errorResponse: (err: any) => ({
      statusCode: 401,
      success: false,
      error: 'Unauthorized',
      message: err.message || 'Authentication required'
    })
  })

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Campaign API',
        description: 'API for campaign management with pagination support',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your Bearer token in the format: Bearer <token>'
          }
        }
      }
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
  })
}
