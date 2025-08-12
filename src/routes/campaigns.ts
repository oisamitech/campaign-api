import { FastifyInstance } from 'fastify'
import { ListCampaignsUseCaseImpl } from '../usecases/list-campaigns.js'
import { PrismaCampaignRepository, PaginationParams } from '../infra/database/repositories/index.js'
import { prisma } from '../infra/database/prisma.js'
import { listCampaignsSchema } from '../schemas/campaigns.js'
import { ListCampaignsQuery } from '../types/routes.js'

export async function campaignRoutes(fastify: FastifyInstance) {
  const campaignRepository = new PrismaCampaignRepository(prisma)
  const listCampaignsUseCase = new ListCampaignsUseCaseImpl(campaignRepository)

  fastify.get(
    '/campaigns',
    {
      schema: listCampaignsSchema,
      preHandler: [fastify.verifyBearerAuth!]
    },
    async (request, reply) => {
      try {
        const { page, limit } = request.query as ListCampaignsQuery

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
          statusCode: 500,
          success: false,
          error: 'Internal server error',
          message: 'Failed to list campaigns',
        })
      }
    }
  )
}
