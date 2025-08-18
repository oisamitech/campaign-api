import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'
import { PrismaClient } from '@prisma/client'
import { env } from '../../src/config/env.js'

describe('Update Campaign Integration Tests', () => {
  let app: FastifyInstance
  let prisma: PrismaClient

  // Helper function para criar headers de autorização
  const getAuthHeaders = () => {
    const authKey = env.BEARER_AUTH_KEY?.split(',')[0] || 'test-token'
    return {
      authorization: `Bearer ${authKey}`,
      'content-type': 'application/json',
    }
  }

  // Payload válido para criar campanha com regras
  const getValidCampaignPayload = () => ({
    name: 'Test Campaign - Update',
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

  // Helper function para criar uma campanha de teste
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
    // Criar aplicação Fastify
    app = await createApp()

    // Conectar ao banco MySQL do docker-compose
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'mysql://campaign_user:campaign_password@localhost:3306/campaigns',
        },
      },
    })

    // Aguardar conexão
    await prisma.$connect()
    console.log('✅ Conectado ao banco MySQL para testes de update')
  })

  beforeEach(async () => {
    // Limpar campanhas e regras existentes antes de cada teste
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()
  })

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()

    // Desconectar
    await prisma.$disconnect()
    console.log('✅ Desconectado do banco MySQL')

    // Fechar aplicação
    await app.close()
    console.log('✅ Aplicação Fastify fechada')
  })

  describe('PATCH /api/campaigns/:id - Success Cases (200)', () => {
    it('should update campaign basic fields successfully', async () => {
      // Criar uma campanha primeiro
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        name: 'Updated Campaign Name',
        isDefault: true,
        status: 'INACTIVE',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.id).toBe(createdCampaign.id)
      expect(body.data.name).toBe(updatePayload.name)
      expect(body.data.isDefault).toBe(updatePayload.isDefault)
      expect(body.data.status).toBe(updatePayload.status)
      expect(body.data.updatedAt).toBeDefined()

      // Verificar se foi realmente atualizado no banco
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: BigInt(createdCampaign.id) },
      })
      expect(updatedCampaign).toBeDefined()
      expect(updatedCampaign?.name).toBe(updatePayload.name)
      expect(updatedCampaign?.isDefault).toBe(updatePayload.isDefault)
      expect(updatedCampaign?.status).toBe(updatePayload.status)
    })

    it('should update only one field and keep others unchanged', async () => {
      const createdCampaign = await createTestCampaign()
      const originalName = createdCampaign.name
      const originalStatus = createdCampaign.status

      const updatePayload = {
        isDefault: true, // Só alterar isDefault
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.isDefault).toBe(true)
      expect(body.data.name).toBe(originalName) // Deve permanecer inalterado
      expect(body.data.status).toBe(originalStatus) // Deve permanecer inalterado
    })

    it('should update campaign dates successfully', async () => {
      const createdCampaign = await createTestCampaign({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-06-01T00:00:00.000Z',
      })

      const updatePayload = {
        startDate: '2024-02-01T00:00:00.000Z',
        endDate: '2024-08-01T00:00:00.000Z',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(new Date(body.data.startDate)).toEqual(
        new Date(updatePayload.startDate)
      )
      expect(new Date(body.data.endDate)).toEqual(
        new Date(updatePayload.endDate)
      )
    })
  })

  describe('PATCH /api/campaigns/:id - Validation Errors (400)', () => {
    it('should return 400 when no fields are provided for update', async () => {
      // Criar uma campanha primeiro
      const createdCampaign = await createTestCampaign()

      const updatePayload = {} // Payload vazio

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain(
        'body must NOT have fewer than 1 properties'
      )
    })

    it('should return 400 when name is empty string', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        name: '',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain(
        'body/name must NOT have fewer than 1 characters'
      )
    })

    it('should return 400 when name exceeds 255 characters', async () => {
      const createdCampaign = await createTestCampaign()
      const tooLongName = 'A'.repeat(256)

      const updatePayload = {
        name: tooLongName,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain(
        'body/name must NOT have more than 255 characters'
      )
    })

    it('should return 400 when start date is invalid format', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        startDate: 'invalid-date-format',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain(
        'body/startDate must match format "date-time"'
      )
    })

    it('should return 400 when end date is invalid format', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        endDate: 'not-a-date',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain(
        'body/endDate must match format "date-time"'
      )
    })

    it('should return 400 when status is invalid', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        status: 'INVALID_STATUS',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain(
        'body/status must be equal to one of the allowed values'
      )
    })
  })

  describe('PATCH /api/campaigns/:id - Not Found Errors (404)', () => {
    it('should return 404 when campaign does not exist', async () => {
      const nonExistentId = '99999'

      const updatePayload = {
        name: 'Updated Name',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${nonExistentId}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('Campaign not found')
    })
  })

  describe('PATCH /api/campaigns/:id - Edge Cases', () => {
    it('should handle name with exactly 255 characters', async () => {
      const createdCampaign = await createTestCampaign()
      const maxLengthName = 'A'.repeat(255)

      const updatePayload = {
        name: maxLengthName,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.name).toBe(maxLengthName)
    })

    it('should trim whitespace from campaign name', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        name: '   Trimmed Campaign Name   ',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.name).toBe('Trimmed Campaign Name')
    })

    it('should handle special characters in campaign name', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        name: 'Campaign with Special Chars: àáâãäçéêëíîïóôõöúûüý @#$%&*()[]{}!?',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.name).toBe(updatePayload.name)
    })

    it('should handle date updates crossing year boundaries', async () => {
      const createdCampaign = await createTestCampaign({
        startDate: '2024-12-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      })

      const updatePayload = {
        endDate: '2025-06-01T00:00:00.000Z', // Próximo ano
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(new Date(body.data.endDate).getFullYear()).toBe(2025)
    })
  })

  describe('PATCH /api/campaigns/:id - Authentication Tests', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        name: 'Updated Name',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: {
          'content-type': 'application/json',
        },
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 when invalid token is provided', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        name: 'Updated Name',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: {
          authorization: 'Bearer invalid-token',
          'content-type': 'application/json',
        },
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('PATCH /api/campaigns/:id - Notes about Rules', () => {
    it('should note that rules are managed separately via dedicated endpoints', async () => {
      const createdCampaign = await createTestCampaign()

      // Verificar que a campanha foi criada com regras
      expect(createdCampaign.rules).toBeDefined()
      expect(createdCampaign.rules.length).toBeGreaterThan(0)

      // Atualizar apenas dados básicos da campanha
      const updatePayload = {
        name: 'Updated Campaign Name',
        status: 'INACTIVE',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.name).toBe(updatePayload.name)
      expect(body.data.status).toBe(updatePayload.status)

      // Note: As regras não são retornadas no endpoint de update
      // Elas devem ser gerenciadas via endpoints específicos de regras
      expect(body.data.rules).toBeUndefined()

      // Verificar que as regras ainda existem no banco
      const rulesInDb = await prisma.rule.findMany({
        where: { campaignId: BigInt(createdCampaign.id), deletedAt: null },
      })
      expect(rulesInDb.length).toBeGreaterThan(0)
    })
  })

  describe('PATCH /api/campaigns/:id - Date Overlap Validation Tests', () => {
    it('should reject update when new dates overlap with existing campaign', async () => {
      await createTestCampaign({
        name: 'First Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      })

      const secondCampaign = await createTestCampaign({
        name: 'Second Campaign',
        startDate: '2024-10-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      })

      const updatePayload = {
        startDate: '2024-07-15T00:00:00.000Z',
        endDate: '2024-09-15T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${secondCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(409)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Date Overlap Error')
      expect(body.message).toContain('está em conflito com a campanha')
      expect(body.message).toContain('First Campaign')
    })

    it('should allow update when new dates do not overlap with any existing campaign', async () => {
      await createTestCampaign({
        name: 'First Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      })

      const secondCampaign = await createTestCampaign({
        name: 'Second Campaign',
        startDate: '2024-10-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      })

      const updatePayload = {
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-03-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${secondCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.startDate).toBe('2025-01-01T00:00:00.000Z')
      expect(body.data.endDate).toBe('2025-03-31T23:59:59.000Z')
    })

    it('should allow update when only changing startDate and it does not create overlap', async () => {
      await createTestCampaign({
        name: 'First Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      })

      const secondCampaign = await createTestCampaign({
        name: 'Second Campaign',
        startDate: '2024-10-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      })

      const updatePayload = {
        startDate: '2024-11-01T00:00:00.000Z',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${secondCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.startDate).toBe('2024-11-01T00:00:00.000Z')
      expect(body.data.endDate).toBe('2024-12-31T23:59:59.000Z')
    })

    it('should allow update when only changing endDate and it does not create overlap', async () => {
      await createTestCampaign({
        name: 'First Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      })

      const secondCampaign = await createTestCampaign({
        name: 'Second Campaign',
        startDate: '2024-10-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      })

      const updatePayload = {
        endDate: '2024-11-30T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${secondCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.startDate).toBe('2024-10-01T00:00:00.000Z')
      expect(body.data.endDate).toBe('2024-11-30T23:59:59.000Z')
    })

    it('should not check overlap when only updating non-date fields', async () => {
      await createTestCampaign({
        name: 'First Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      })

      const secondCampaign = await createTestCampaign({
        name: 'Second Campaign',
        startDate: '2024-10-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      })

      const updatePayload = {
        name: 'Updated Second Campaign',
        status: 'INACTIVE',
        isDefault: true,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${secondCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Updated Second Campaign')
      expect(body.data.status).toBe('INACTIVE')
      expect(body.data.isDefault).toBe(true)
    })

    it('should exclude itself from overlap validation', async () => {
      const campaign = await createTestCampaign({
        name: 'Test Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      })

      const updatePayload = {
        startDate: '2024-05-15T00:00:00.000Z',
        endDate: '2024-09-15T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${campaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.startDate).toBe('2024-05-15T00:00:00.000Z')
      expect(body.data.endDate).toBe('2024-09-15T23:59:59.000Z')
    })
  })
})
