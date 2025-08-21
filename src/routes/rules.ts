import { FastifyInstance } from 'fastify'
import { UpdateRuleUseCaseImpl } from '../usecases/index.js'
import { PrismaRuleRepository } from '../infra/database/repositories/index.js'
import { prisma } from '../infra/database/prisma.js'
import { updateRuleSchema } from '../schemas/rules.js'
import { UpdateRuleParams, UpdateRuleBody } from '../types/routes.js'

export async function ruleRoutes(fastify: FastifyInstance) {
  const ruleRepository = new PrismaRuleRepository(prisma)
  const updateRuleUseCase = new UpdateRuleUseCaseImpl(ruleRepository)

  fastify.patch(
    '/rules/:id',
    {
      schema: updateRuleSchema,
      preHandler: [fastify.verifyBearerAuth!],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as UpdateRuleParams
        const body = request.body as UpdateRuleBody

        const result = await updateRuleUseCase.execute(id, body)

        return reply.status(200).send({
          success: true,
          data: result,
        })
      } catch (error: unknown) {
        console.error('Error updating rule:', error)

        if (error instanceof Error && error.message === 'Rule not found') {
          return reply.status(404).send({
            statusCode: 404,
            success: false,
            error: 'Not Found',
            message: 'Rule not found',
          })
        }

        return reply.status(500).send({
          statusCode: 500,
          success: false,
          error: 'Internal server error',
          message: 'Failed to update rule',
        })
      }
    }
  )
}
