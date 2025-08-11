import { startServer } from './app.js'
import { disconnectDatabase } from './infra/database/prisma.js'

let server: any

async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`)

  if (server) {
    try {
      await server.close()
      console.log('Server closed successfully')
    } catch (error) {
      console.error('Error closing server:', error)
    }
  }

  try {
    await disconnectDatabase()
  } catch (error) {
    console.error('Error disconnecting database:', error)
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
      console.error('Uncaught Exception:', error)
      gracefulShutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      gracefulShutdown('unhandledRejection')
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
