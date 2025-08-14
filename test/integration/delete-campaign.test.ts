import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'
import { PrismaClient } from '@prisma/client'
import { env } from '../../src/config/env.js'

describe('Delete Campaign Integration Tests', () => {
  let app: FastifyInstance
  let prisma: PrismaClient

  const getAuthHeaders = () => {
    const authKey = env.BEARER_AUTH_KEY?.split(',')[0] || 'test-token'
    return {
      authorization: `Bearer ${authKey}`,
      'content-type': 'application/json',
    }
  }

  const getAuthHeadersWithoutContentType = () => {
    const authKey = env.BEARER_AUTH_KEY?.split(',')[0] || 'test-token'
    return {
      authorization: `Bearer ${authKey}`,
    }
  }

  const getValidCampaignPayload = () => ({
    name: 'Test Campaign - Delete',
    startDate: '2024-06-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.000Z',
    minLives: 5,
    maxLives: 20,
    plans: [1, 2, 3],
    value: 15,
    isDefault: false,
    paymentMethod: ['PIX', 'CREDITCARD'],
    accommodation: ['APARTMENT'],
    typeProduct: ['withParticipation'],
    obstetrics: ['withObstetric'],
  })

  const createTestCampaign = async (customPayload = {}) => {
    const payload = { ...getValidCampaignPayload(), ...customPayload }

    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns',
      headers: getAuthHeaders(),
      payload,
    })

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    return body.data
  }

  beforeAll(async () => {
    app = await createApp()

    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'mysql://campaign_user:campaign_password@localhost:3306/campaigns',
        },
      },
    })

    await prisma.$connect()
    console.log('✅ Conectado ao banco MySQL para testes de delete')
  })

  beforeEach(async () => {
    await prisma.campaign.deleteMany()
  })

  afterAll(async () => {
    await prisma.campaign.deleteMany()

    await prisma.$disconnect()
    console.log('✅ Desconectado do banco MySQL')

    await app.close()
    console.log('✅ Aplicação Fastify fechada')
  })

  describe('DELETE /api/campaigns/:id - Success Cases (200)', () => {
    it('should delete a campaign successfully with valid ID', async () => {
      const createdCampaign = await createTestCampaign()

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      expect(body).toMatchObject({
        success: true,
        data: {
          id: createdCampaign.id,
          name: createdCampaign.name,
          startDate: createdCampaign.startDate,
          endDate: createdCampaign.endDate,
          isDefault: createdCampaign.isDefault,
          minLives: createdCampaign.minLives,
          maxLives: createdCampaign.maxLives,
          plans: createdCampaign.plans,
          value: createdCampaign.value,
          createdAt: createdCampaign.createdAt,
          paymentMethod: createdCampaign.paymentMethod,
          accommodation: createdCampaign.accommodation,
          typeProduct: createdCampaign.typeProduct,
          obstetrics: createdCampaign.obstetrics,
          updatedAt: expect.any(String),
          deletedAt: expect.any(String),
        },
      })

      expect(body.data.deletedAt).toBeTruthy()

      expect(new Date(body.data.updatedAt).getTime()).toBeGreaterThan(
        new Date(createdCampaign.updatedAt).getTime()
      )
    })
  })

  describe('DELETE /api/campaigns/:id - Client Error Cases (4xx)', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/campaigns/1',
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        statusCode: 401,
        success: false,
        error: 'Unauthorized',
        message: 'missing authorization header',
      })
    })

    it('should return 401 when invalid bearer token is provided', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/campaigns/1',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        statusCode: 401,
        success: false,
        error: 'Unauthorized',
        message: 'invalid authorization header',
      })
    })

    it('should return 400 when campaign ID is invalid (non-numeric)', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/campaigns/invalid-id',
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        statusCode: 400,
        success: false,
        error: 'Validation Error',
        message: 'params/id must match pattern \"^[0-9]+$\"',
      })
    })

    it('should return 404 when campaign does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/campaigns/999999',
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        statusCode: 404,
        success: false,
        error: 'Not Found',
        message: 'Campaign not found',
      })
    })

    it('should return 404 when trying to delete already deleted campaign', async () => {
      const createdCampaign = await createTestCampaign()

      const firstDeleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(firstDeleteResponse.statusCode).toBe(200)

      const secondDeleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(secondDeleteResponse.statusCode).toBe(404)

      const body = JSON.parse(secondDeleteResponse.body)
      expect(body).toMatchObject({
        statusCode: 404,
        success: false,
        error: 'Not Found',
        message: 'Campaign not found',
      })
    })

    it('should return 400 when campaign ID is negative', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/campaigns/-1',
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        statusCode: 400,
        success: false,
        error: 'Validation Error',
      })
    })

    it('should return 404 when campaign ID is zero', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/campaigns/0',
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        statusCode: 404,
        success: false,
        error: 'Not Found',
        message: 'Campaign not found',
      })
    })
  })

  describe('DELETE /api/campaigns/:id - Soft Delete Behavior', () => {
    it('should soft delete a campaign (not remove from database)', async () => {
      const createdCampaign = await createTestCampaign()

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(200)

      // Verificar que a campanha ainda existe no banco mas com deletedAt definido
      const campaignInDb = await prisma.campaign.findUnique({
        where: { id: BigInt(createdCampaign.id) },
      })

      expect(campaignInDb).toBeTruthy()
      expect(campaignInDb!.deletedAt).toBeTruthy()
    })

    it('should not return deleted campaign in list endpoint', async () => {
      const createdCampaign = await createTestCampaign()

      await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      // Listar campanhas - não deve retornar a campanha deletada
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(listResponse.statusCode).toBe(200)
      const listBody = JSON.parse(listResponse.body)
      expect(listBody.data).toHaveLength(0)
      expect(listBody.meta.totalItems).toBe(0)
    })

    it('should not allow update of deleted campaign', async () => {
      const createdCampaign = await createTestCampaign()

      await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      // Tentar atualizar a campanha deletada
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: { name: 'Updated Name' },
      })

      expect(updateResponse.statusCode).toBe(404)
      const updateBody = JSON.parse(updateResponse.body)
      expect(updateBody.message).toBe('Campaign not found')
    })
  })

  describe('DELETE /api/campaigns/:id - Integration Tests', () => {
    it('should maintain data integrity when deleting default campaign', async () => {
      const defaultCampaign = await createTestCampaign({ isDefault: true })

      const normalCampaign = await createTestCampaign({
        name: 'Normal Campaign',
        isDefault: false,
      })

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${defaultCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(200)

      // Verificar que a outra campanha ainda existe na listagem
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(listResponse.statusCode).toBe(200)
      const listBody = JSON.parse(listResponse.body)
      expect(listBody.data).toHaveLength(1)
      expect(listBody.data[0].id).toBe(normalCampaign.id)
    })

    it('should preserve database constraints after soft delete', async () => {
      const campaign = await createTestCampaign()

      await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${campaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      // Criar uma nova campanha com o mesmo nome (deve ser permitido)
      const newCampaignResponse = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: {
          ...getValidCampaignPayload(),
          name: campaign.name,
        },
      })

      expect(newCampaignResponse.statusCode).toBe(201)

      const newCampaignBody = JSON.parse(newCampaignResponse.body)
      expect(newCampaignBody.data.name).toBe(campaign.name)
      expect(newCampaignBody.data.id).not.toBe(campaign.id)
    })

    it('should handle very large ID numbers', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/campaigns/999999999999999999',
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        statusCode: 404,
        success: false,
        error: 'Not Found',
        message: 'Campaign not found',
      })
    })
  })
})
