import pino from 'pino'
import { env } from './env.js'

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
})
