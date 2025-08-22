import { config } from 'dotenv'
import path from 'path'

const nodeEnv = process.env.NODE_ENV || 'development'

if (nodeEnv === 'test') {
  config({ path: path.resolve(process.cwd(), '.env.test') })
} else {
  config()
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DATABASE_URL: process.env.DATABASE_URL,
  BEARER_AUTH_KEY: process.env.BEARER_AUTH_KEY,
} as const
