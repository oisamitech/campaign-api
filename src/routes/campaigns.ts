import { FastifyInstance } from 'fastify'
import {
  ListCampaignsUseCaseImpl,
  CreateCampaignUseCaseImpl,
  UpdateCampaignUseCaseImpl,
  DeleteCampaignUseCaseImpl,
} from '../usecases/index.js'
import {
  PrismaCampaignRepository,
  PrismaRuleRepository,
  PaginationParams,
} from '../infra/database/repositories/index.js'
import { prisma } from '../infra/database/prisma.js'
import {
  listCampaignsSchema,
  createCampaignSchema,
  updateCampaignSchema,
  deleteCampaignSchema,
} from '../schemas/campaigns.js'
import {
  ListCampaignsQuery,
  CreateCampaignBody,
  UpdateCampaignParams,
  UpdateCampaignBody,
  DeleteCampaignParams,
} from '../types/routes.js'

export async function campaignRoutes(fastify: FastifyInstance) {
  const campaignRepository = new PrismaCampaignRepository(prisma)
  const ruleRepository = new PrismaRuleRepository(prisma)

  const listCampaignsUseCase = new ListCampaignsUseCaseImpl(campaignRepository)
  const createCampaignUseCase = new CreateCampaignUseCaseImpl(
    campaignRepository,
    ruleRepository
  )
  const updateCampaignUseCase = new UpdateCampaignUseCaseImpl(
    campaignRepository,
    ruleRepository
  )
  const deleteCampaignUseCase = new DeleteCampaignUseCaseImpl(
    campaignRepository,
    ruleRepository
  )

  fastify.get(
    '/campaigns',
    {
      schema: listCampaignsSchema,
      preHandler: [fastify.verifyBearerAuth!],
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
      preHandler: [fastify.verifyBearerAuth!],
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

        if (error instanceof Error && error.name === 'DateOverlapError') {
          return reply.status(409).send({
            statusCode: 409,
            success: false,
            error: 'Date Overlap Error',
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

  fastify.patch(
    '/campaigns/:id',
    {
      schema: updateCampaignSchema,
      preHandler: [fastify.verifyBearerAuth!],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as UpdateCampaignParams
        const body = request.body as UpdateCampaignBody

        const result = await updateCampaignUseCase.execute(id, body)

        return reply.status(200).send({
          success: true,
          data: result,
        })
      } catch (error: unknown) {
        console.error('Error updating campaign:', error)

        if (error instanceof Error && error.message === 'Campaign not found') {
          return reply.status(404).send({
            statusCode: 404,
            success: false,
            error: 'Not Found',
            message: 'Campaign not found',
          })
        }

        if (error instanceof Error && error.name === 'DateOverlapError') {
          return reply.status(409).send({
            statusCode: 409,
            success: false,
            error: 'Date Overlap Error',
            message: error.message,
          })
        }

        return reply.status(500).send({
          statusCode: 500,
          success: false,
          error: 'Internal server error',
          message: 'Failed to update campaign',
        })
      }
    }
  )

  fastify.delete(
    '/campaigns/:id',
    {
      schema: deleteCampaignSchema,
      preHandler: [fastify.verifyBearerAuth!],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as DeleteCampaignParams
        const result = await deleteCampaignUseCase.execute(id)

        return reply.status(200).send({
          success: true,
          data: result,
        })
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Campaign not found') {
          return reply.status(404).send({
            statusCode: 404,
            success: false,
            error: 'Not Found',
            message: 'Campaign not found',
          })
        }

        return reply.status(500).send({
          statusCode: 500,
          success: false,
          error: 'Internal server error',
          message: 'Failed to delete campaign',
        })
      }
    }
  )
}
