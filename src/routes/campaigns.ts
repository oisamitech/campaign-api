import { FastifyInstance, FastifyReply } from 'fastify'
import {
  ListCampaignsUseCaseImpl,
  PaginationParams,
} from '../usecases/list-campaigns.js'
import { prisma } from '../infra/database/prisma.js'
import { listCampaignsSchema } from '../schemas/campaigns.js'
import { ListCampaignsRequest } from '../types/routes.js'

export async function campaignRoutes(fastify: FastifyInstance) {
  const listCampaignsUseCase = new ListCampaignsUseCaseImpl(prisma)

  fastify.get(
    '/campaigns',
    {
      schema: listCampaignsSchema,
    },
    async (request: ListCampaignsRequest, reply: FastifyReply) => {
      try {
        const { page, limit } = request.query

        const paginationParams: PaginationParams | undefined =
          page || limit
            ? {
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 10,
              }
            : undefined

        const result = await listCampaignsUseCase.execute(paginationParams)

        return reply.status(200).send({
          success: true,
          ...result,
        })
      } catch (error: unknown) {
        console.error('Error listing campaigns:', error)

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          message: 'Failed to list campaigns',
        })
      }
    }
  )
}
