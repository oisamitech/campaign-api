import { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

export async function configureFastify(fastify: FastifyInstance) {
  // Registrar plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  })
}
