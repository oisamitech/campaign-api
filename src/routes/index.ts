import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes, { prefix: '/api' })
}
