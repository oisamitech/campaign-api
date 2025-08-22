import { startServer } from './app.js'
import { disconnectDatabase } from './infra/database/prisma.js'
import { logger } from './config/logger.js'

let server: any

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`)

  if (server) {
    try {
      await server.close()
      logger.info('Server closed successfully')
    } catch (error) {
      logger.error({ error }, 'Error closing server')
    }
  }

  try {
    await disconnectDatabase()
  } catch (error) {
    logger.error({ error }, 'Error disconnecting database')
  }

  process.exit(0)
}

async function start() {
  try {
    server = await startServer()

    // Configurar graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    // Tratamento de erros não capturados
    process.on('uncaughtException', error => {
      logger.error({ error }, 'Uncaught Exception')
      gracefulShutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled Rejection')
      gracefulShutdown('unhandledRejection')
    })
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    process.exit(1)
  }
}

start()
