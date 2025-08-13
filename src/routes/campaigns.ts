import { FastifyInstance } from 'fastify'
import { ListCampaignsUseCaseImpl, CreateCampaignUseCaseImpl } from '../usecases/index.js'
import { PrismaCampaignRepository, PaginationParams } from '../infra/database/repositories/index.js'
import { prisma } from '../infra/database/prisma.js'
import { listCampaignsSchema, createCampaignSchema } from '../schemas/campaigns.js'
import { ListCampaignsQuery, CreateCampaignBody } from '../types/routes.js'

export async function campaignRoutes(fastify: FastifyInstance) {
  const campaignRepository = new PrismaCampaignRepository(prisma)
  const listCampaignsUseCase = new ListCampaignsUseCaseImpl(campaignRepository)
  const createCampaignUseCase = new CreateCampaignUseCaseImpl(campaignRepository)

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

  fastify.post(
    '/campaigns',
    {
      schema: createCampaignSchema,
      preHandler: [fastify.verifyBearerAuth!]
    },
    async (request, reply) => {
      try {
        const body = request.body as CreateCampaignBody

        const result = await createCampaignUseCase.execute(body)

        return reply.status(201).send({
          success: true,
          data: result,
        })
      } catch (error: unknown) {
        console.error('Error creating campaign:', error)

        // Se for um erro de validação do use case, retornar 400
        if (error instanceof Error && (
          error.message.includes('Invalid') ||
          error.message.includes('required') ||
          error.message.includes('must be') ||
          error.message.includes('cannot be')
        )) {
          return reply.status(400).send({
            statusCode: 400,
            success: false,
            error: 'Bad Request',
            message: error.message,
          })
        }

        return reply.status(500).send({
          statusCode: 500,
          success: false,
          error: 'Internal server error',
          message: 'Failed to create campaign',
        })
      }
    }
  )
}
