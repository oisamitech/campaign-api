import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../../config/env.js'

export async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      fastify.log.error(error)

      if ((error as any).statusCode === 401) {
        return reply.status(401).send({
          statusCode: 401,
          success: false,
          error: 'Unauthorized',
          message: error.message || 'Authentication required',
        })
      }

      if ((error as any).validation) {
        return reply.status(400).send({
          statusCode: 400,
          success: false,
          error: 'Validation Error',
          message: error.message,
          details: (error as any).validation,
        })
      }

      if ((error as any).statusCode && (error as any).statusCode !== 500) {
        return reply.status((error as any).statusCode).send({
          statusCode: (error as any).statusCode,
          success: false,
          error: (error as any).error || 'Request Error',
          message: error.message || 'Request failed',
        })
      }

      return reply.status(500).send({
        statusCode: 500,
        success: false,
        error: 'Internal Server Error',
        message:
          env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      })
    }
  )
}
