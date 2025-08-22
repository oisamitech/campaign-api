import { FastifyInstance } from 'fastify'
import { prisma } from '../infra/database/prisma.js'
import { healthSchema } from '../schemas/health.js'
import { logger } from '../config/logger.js'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/health',
    {
      schema: healthSchema,
    },
    async () => {
      let databaseStatus = 'offline'
      let databaseResponseTime = null

      try {
        const startTime = Date.now()
        await prisma.$queryRaw`SELECT 1`
        const endTime = Date.now()

        databaseStatus = 'online'
        databaseResponseTime = endTime - startTime
      } catch (error) {
        databaseStatus = 'offline'
        logger.error({ error }, 'Database health check failed')
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        database: {
          status: databaseStatus,
          provider: 'mysql',
          responseTime: databaseResponseTime
            ? `${databaseResponseTime}ms`
            : null,
        },
      }
    }
  )
}
