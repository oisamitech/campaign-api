import { PrismaClient } from '@prisma/client'
import { env } from '../../config/env.js'
import { logger } from '../../config/logger.js'

const log: Record<string, ('warn' | 'error')[]> = {
  local: ['warn', 'error'],
  development: ['warn', 'error'],
  staging: ['warn', 'error'],
  production: ['warn', 'error'],
}

type NodeEnv = keyof typeof log

export const prisma = new PrismaClient({
  log: log[env.NODE_ENV as NodeEnv] || log.production,
  transactionOptions: {
    maxWait: 300000,
    timeout: 300000,
  },
})

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    logger.info('Database disconnected successfully')
  } catch (error) {
    logger.error({ error }, 'Database disconnection failed')
    throw error
  }
}
