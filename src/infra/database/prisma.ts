import { PrismaClient } from '@prisma/client'
import { env } from '../../config/env.js'

const log = {
    local: ['warn', 'error'],
    development: ['warn', 'error'],
    staging: ['warn', 'error'],
    production: ['warn', 'error']
} as const;

type NodeEnv = keyof typeof log;

export const prisma = new PrismaClient({
    log: log[env.NODE_ENV as NodeEnv],
    transactionOptions: {
        maxWait: 300000,
        timeout: 300000
    }
})

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
    throw error
  }
}
