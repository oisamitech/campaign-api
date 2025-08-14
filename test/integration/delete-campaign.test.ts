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

  // Payload válido para criar campanha com regras
  const getValidCampaignPayload = () => ({
    name: 'Test Campaign - Delete',
    startDate: '2024-06-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.000Z',
    isDefault: false,
    status: 'ACTIVE',
    rules: [
      {
        minLives: 5,
        maxLives: 20,
        plans: [1, 2, 3],
        value: 15,
        paymentMethod: ['PIX', 'CREDITCARD'],
        accommodation: ['APARTMENT'],
        typeProduct: ['withParticipation'],
        obstetrics: ['withObstetric'],
      },
    ],
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
    // Limpar rules primeiro (FK constraint)
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()
  })

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()

    await prisma.$disconnect()
    console.log('✅ Desconectado do banco MySQL')

    await app.close()
    console.log('✅ Aplicação Fastify fechada')
  })

  describe('DELETE /api/campaigns/:id - Success Cases (200)', () => {
    it('should delete a campaign and its rules successfully with valid ID', async () => {
      const createdCampaign = await createTestCampaign()

      // Verificar que a campanha e regras existem
      expect(createdCampaign.rules).toHaveLength(1)

      const rulesBeforeDelete = await prisma.rule.findMany({
        where: { campaignId: BigInt(createdCampaign.id), deletedAt: null },
      })
      expect(rulesBeforeDelete).toHaveLength(1)

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.id).toBe(createdCampaign.id)
      expect(body.data.name).toBe(createdCampaign.name)
      expect(body.data.deletedAt).toBeDefined()

      // Verificar que a campanha foi marcada como deletada (soft delete)
      const deletedCampaign = await prisma.campaign.findUnique({
        where: { id: BigInt(createdCampaign.id) },
      })
      expect(deletedCampaign).toBeDefined()
      expect(deletedCampaign?.deletedAt).toBeDefined()

      // Verificar que as regras também foram marcadas como deletadas
      const deletedRules = await prisma.rule.findMany({
        where: { campaignId: BigInt(createdCampaign.id) },
      })
      expect(deletedRules).toHaveLength(1)
      expect(deletedRules[0].deletedAt).toBeDefined()

      // Verificar que não aparece nas consultas de campanhas ativas
      const activeCampaigns = await prisma.campaign.findMany({
        where: { deletedAt: null },
      })
      expect(activeCampaigns).toHaveLength(0)

      const activeRules = await prisma.rule.findMany({
        where: { deletedAt: null },
      })
      expect(activeRules).toHaveLength(0)
    })

    it('should delete a campaign with multiple rules successfully', async () => {
      const campaignWithMultipleRules = await createTestCampaign({
        name: 'Campaign with Multiple Rules',
        rules: [
          {
            minLives: 1,
            maxLives: 5,
            plans: [1, 2],
            value: 10,
            paymentMethod: ['PIX'],
            accommodation: ['APARTMENT'],
            typeProduct: ['withParticipation'],
            obstetrics: ['withObstetric'],
          },
          {
            minLives: 6,
            maxLives: 15,
            plans: [3, 4, 5],
            value: 20,
            paymentMethod: ['CREDITCARD'],
            accommodation: ['INFIRMARY'],
            typeProduct: ['withoutParticipation'],
            obstetrics: ['withoutObstetric'],
          },
        ],
      })

      expect(campaignWithMultipleRules.rules).toHaveLength(2)

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${campaignWithMultipleRules.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(200)

      const deletedRules = await prisma.rule.findMany({
        where: { campaignId: BigInt(campaignWithMultipleRules.id) },
      })
      expect(deletedRules).toHaveLength(2)
      deletedRules.forEach(rule => {
        expect(rule.deletedAt).toBeDefined()
      })
    })

    it('should handle deleting a campaign that has no rules (edge case)', async () => {
      const campaignWithoutRules = await prisma.campaign.create({
        data: {
          name: 'Campaign without rules',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          isDefault: false,
          status: 'ACTIVE',
        },
      })

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${campaignWithoutRules.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.deletedAt).toBeDefined()
    })
  })

  describe('DELETE /api/campaigns/:id - Validation Errors (400)', () => {
    it('should return 400 when ID format is invalid (schema validation)', async () => {
      const invalidSchemaIds = ['abc', 'test', '12.34', '12abc', 'abc123', '']

      for (const invalidId of invalidSchemaIds) {
        const response = await app.inject({
          method: 'DELETE',
          url: `/api/campaigns/${invalidId}`,
          headers: getAuthHeadersWithoutContentType(),
        })

        expect(response.statusCode).toBe(400)

        const body = JSON.parse(response.body)
        expect(body.success).toBe(false)
        expect(body.message).toContain(
          'params/id must match pattern "^[0-9]+$"'
        )
      }
    })
  })

  describe('DELETE /api/campaigns/:id - Not Found Errors (404)', () => {
    it('should return 404 when campaign does not exist', async () => {
      const nonExistentIds = ['99999', '0', '1']

      for (const nonExistentId of nonExistentIds) {
        const response = await app.inject({
          method: 'DELETE',
          url: `/api/campaigns/${nonExistentId}`,
          headers: getAuthHeadersWithoutContentType(),
        })

        expect(response.statusCode).toBe(404)

        const body = JSON.parse(response.body)
        expect(body.success).toBe(false)
        expect(body.error).toBe('Not Found')
        expect(body.message).toBe('Campaign not found')
      }
    })

    it('should return 404 when trying to delete already deleted campaign', async () => {
      const createdCampaign = await createTestCampaign()

      const firstResponse = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(firstResponse.statusCode).toBe(200)

      const secondResponse = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(secondResponse.statusCode).toBe(404)

      const body = JSON.parse(secondResponse.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('Campaign not found')
    })
  })

  describe('DELETE /api/campaigns/:id - Authentication Tests', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const createdCampaign = await createTestCampaign()

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 when invalid token is provided', async () => {
      const createdCampaign = await createTestCampaign()

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('DELETE /api/campaigns/:id - Database Integrity Tests', () => {
    it('should maintain referential integrity when deleting campaigns with rules', async () => {
      const createdCampaign = await createTestCampaign()
      const campaignId = BigInt(createdCampaign.id)

      // Verificar estado inicial
      const initialCampaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { rules: true },
      })
      expect(initialCampaign).toBeDefined()
      expect(initialCampaign?.rules).toHaveLength(1)

      // Deletar campanha
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(200)

      // Verificar que a campanha e regras existem mas estão marcadas como deletadas
      const deletedCampaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { rules: true },
      })
      expect(deletedCampaign).toBeDefined()
      expect(deletedCampaign?.deletedAt).toBeDefined()
      expect(deletedCampaign?.rules).toHaveLength(1)
      expect(deletedCampaign?.rules[0].deletedAt).toBeDefined()

      // Verificar que não aparecem em consultas de dados ativos
      const activeCampaigns = await prisma.campaign.findMany({
        where: { deletedAt: null },
        include: { rules: { where: { deletedAt: null } } },
      })
      expect(activeCampaigns).toHaveLength(0)
    })

    // it('should handle concurrent delete requests gracefully', async () => {
    //   const createdCampaign = await createTestCampaign()

    //   // Fazer requisições simultâneas de delete
    //   const deleteRequests = [
    //     app.inject({
    //       method: 'DELETE',
    //       url: `/api/campaigns/${createdCampaign.id}`,
    //       headers: getAuthHeadersWithoutContentType(),
    //     }),
    //     app.inject({
    //       method: 'DELETE',
    //       url: `/api/campaigns/${createdCampaign.id}`,
    //       headers: getAuthHeadersWithoutContentType(),
    //     }),
    //     app.inject({
    //       method: 'DELETE',
    //       url: `/api/campaigns/${createdCampaign.id}`,
    //       headers: getAuthHeadersWithoutContentType(),
    //     }),
    //   ]

    //   const responses = await Promise.all(deleteRequests)

    //   // Uma deve ser bem-sucedida (200) e as outras devem falhar (404)
    //   const successfulDeletes = responses.filter(r => r.statusCode === 200)
    //   const failedDeletes = responses.filter(r => r.statusCode === 404)

    //   expect(successfulDeletes).toHaveLength(1)
    //   expect(failedDeletes).toHaveLength(2)

    //   // Verificar que a campanha foi deletada apenas uma vez
    //   const deletedCampaign = await prisma.campaign.findUnique({
    //     where: { id: BigInt(createdCampaign.id) }
    //   })
    //   expect(deletedCampaign?.deletedAt).toBeDefined()
    // })
  })

  describe('DELETE /api/campaigns/:id - Edge Cases', () => {
    it('should handle very large campaign IDs', async () => {
      const veryLargeId = '999999999999999999'

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${veryLargeId}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toBe('Campaign not found')
    })

    it('should preserve campaign data in deleted state', async () => {
      const createdCampaign = await createTestCampaign({
        name: 'Campaign to preserve data',
      })

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeadersWithoutContentType(),
      })

      expect(response.statusCode).toBe(200)

      // Verificar que os dados da campanha foram preservados
      const deletedCampaign = await prisma.campaign.findUnique({
        where: { id: BigInt(createdCampaign.id) },
      })
      expect(deletedCampaign?.name).toBe('Campaign to preserve data')
      expect(deletedCampaign?.startDate).toBeDefined()
      expect(deletedCampaign?.endDate).toBeDefined()
      expect(deletedCampaign?.deletedAt).toBeDefined()

      // Verificar que os dados das regras também foram preservados
      const deletedRules = await prisma.rule.findMany({
        where: { campaignId: BigInt(createdCampaign.id) },
      })
      expect(deletedRules).toHaveLength(1)
      expect(deletedRules[0].minLives).toBeDefined()
      expect(deletedRules[0].maxLives).toBeDefined()
      expect(deletedRules[0].deletedAt).toBeDefined()
    })
  })
})
