import { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export async function configureFastify(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: true,
    credentials: true,
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
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
  })
}
