import { config } from 'dotenv'
import path from 'path'

// Carregar variáveis de ambiente baseado no NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development'

// Definir qual arquivo .env carregar
if (nodeEnv === 'test') { 
  console.log('carregando .env.test')
  // Para testes, carregar .env.test se existir, senão .env
  config({ path: path.resolve(process.cwd(), '.env.test') })
  // Se .env.test não existir, dotenv vai usar o .env padrão
} else {
  // Para outros ambientes, carregar .env
  config()
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DATABASE_URL: process.env.DATABASE_URL,
} as const
