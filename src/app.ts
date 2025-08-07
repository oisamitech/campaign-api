import Fastify, { FastifyInstance } from 'fastify'
import { env } from './config/env.js'
import { configureFastify } from './infra/fastify-config.js'
import { errorHandler, requestLogger } from './infra/hooks/index.js'
import { registerRoutes } from './routes/index.js'

export async function createApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    trustProxy: true,
  })

  // Configurar Fastify (plugins, etc.)
  await configureFastify(fastify)

  // Registrar hooks
  await errorHandler(fastify)
  await requestLogger(fastify)

  // Registrar rotas
  await registerRoutes(fastify)

  return fastify
}

export async function startServer(): Promise<FastifyInstance> {
  const app = await createApp()

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    app.log.info(`Server is running on http://${env.HOST}:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }

  return app
}
