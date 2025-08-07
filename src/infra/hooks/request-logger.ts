import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export async function requestLogger(fastify: FastifyInstance) {
  fastify.addHook(
    'onRequest',
    (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
      fastify.log.info({
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
      })
      done()
    }
  )
}
