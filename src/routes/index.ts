import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { campaignRoutes } from './campaigns.js'
import { ruleRoutes } from './rules.js'

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes, { prefix: '/api' })
  await fastify.register(campaignRoutes, { prefix: '/api' })
  await fastify.register(ruleRoutes, { prefix: '/api' })
}
