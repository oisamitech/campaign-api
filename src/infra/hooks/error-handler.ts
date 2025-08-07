import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../../config/env.js'

export async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      fastify.log.error(error)

      if ((error as any).validation) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
          details: (error as any).validation,
        })
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message:
          env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      })
    }
  )
}
