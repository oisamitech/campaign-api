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

  // Helper function para criar payload válido de campanha para criação
  const getValidCampaignPayload = () => ({
    name: 'Test Campaign - Update',
    startDate: '2024-06-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.000Z',
    minLives: 5,
    maxLives: 20,
    plans: [1, 2, 3],
    value: 15,
    isDefault: false,
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
    // Limpar campanhas existentes antes de cada teste
    await prisma.campaign.deleteMany()
  })

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.campaign.deleteMany()

    // Desconectar
    await prisma.$disconnect()
    console.log('✅ Desconectado do banco MySQL')

    // Fechar aplicação
    await app.close()
    console.log('✅ Aplicação Fastify fechada')
  })

  describe('PATCH /api/campaigns/:id - Success Cases (200)', () => {
    it('should update a campaign successfully with valid data', async () => {
      // Criar uma campanha primeiro
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        name: 'Updated Campaign Name',
        value: 25,
        minLives: 10,
        maxLives: 30,
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
      expect(body.data.value).toBe(updatePayload.value)
      expect(body.data.minLives).toBe(updatePayload.minLives)
      expect(body.data.maxLives).toBe(updatePayload.maxLives)
      expect(body.data.updatedAt).toBeDefined()

      // Verificar se foi realmente atualizado no banco
      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: parseInt(createdCampaign.id) },
      })
      expect(updatedCampaign).toBeDefined()
      expect(updatedCampaign?.name).toBe(updatePayload.name)
      expect(updatedCampaign?.value).toBe(updatePayload.value)
      expect(updatedCampaign?.minLives).toBe(updatePayload.minLives)
      expect(updatedCampaign?.maxLives).toBe(updatePayload.maxLives)
    })

    it('should update only one field and keep others unchanged', async () => {
      const createdCampaign = await createTestCampaign()
      const originalName = createdCampaign.name
      const originalValue = createdCampaign.value

      const updatePayload = {
        minLives: 15, // Só alterar minLives
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.minLives).toBe(15)
      expect(body.data.name).toBe(originalName) // Deve permanecer inalterado
      expect(body.data.value).toBe(originalValue) // Deve permanecer inalterado
    })

    it('should update isDefault field successfully', async () => {
      const createdCampaign = await createTestCampaign({ isDefault: false })

      const updatePayload = {
        isDefault: true,
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
      expect(body.message).toContain('body must NOT have fewer than 1 properties')
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
      expect(body.message).toContain('body/name must NOT have fewer than 1 characters')
    })

    it('should return 400 when minLives is zero or negative', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        minLives: 0,
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
      expect(body.message).toContain('body/minLives must be >= 1')
    })

    it('should return 400 when value is out of range', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload1 = {
        value: 0,
      }

      const response1 = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload1,
      })

      expect(response1.statusCode).toBe(400)

      const updatePayload2 = {
        value: 101,
      }

      const response2 = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload2,
      })

      expect(response2.statusCode).toBe(400)
    })

    it('should return 400 when plans array is empty', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        plans: [],
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
      expect(body.message).toContain('body/plans must NOT have fewer than 1 items')
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
      expect(body.message).toContain('body/name must NOT have more than 255 characters')
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
      expect(body.message).toContain('body/startDate must match format "date-time"')
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
      expect(body.message).toContain('body/endDate must match format "date-time"')
    })

    it('should return 400 when new start date is after existing end date', async () => {
      const createdCampaign = await createTestCampaign({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-06-01T00:00:00.000Z',
      })

      const updatePayload = {
        startDate: '2024-12-01T00:00:00.000Z', // Depois do endDate existente
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain('Start date must be before end date')
    })

    it('should return 400 when new end date is before existing start date', async () => {
      const createdCampaign = await createTestCampaign({
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-12-01T00:00:00.000Z',
      })

      const updatePayload = {
        endDate: '2024-01-01T00:00:00.000Z', // Antes do startDate existente
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain('Start date must be before end date')
    })

    it('should return 400 when new minLives is greater than existing maxLives', async () => {
      const createdCampaign = await createTestCampaign({
        minLives: 5,
        maxLives: 10,
      })

      const updatePayload = {
        minLives: 15, 
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain('Minimum lives cannot be greater than maximum lives')
    })

    it('should return 400 when new maxLives is less than existing minLives', async () => {
      const createdCampaign = await createTestCampaign({
        minLives: 10,
        maxLives: 20,
      })

      const updatePayload = {
        maxLives: 5,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain('Minimum lives cannot be greater than maximum lives')
    })

    it('should return 400 when plans contains negative numbers', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        plans: [1, 2, -1, 3],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain('body/plans/2 must be >= 1')
    })

    it('should return 400 when plans contains zero', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        plans: [1, 2, 0, 3],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.message).toContain('body/plans/2 must be >= 1')
    })

    it('should handle large plans array successfully', async () => {
      const createdCampaign = await createTestCampaign()
      const largePlansArray = Array.from({ length: 100 }, (_, i) => i + 1)

      const updatePayload = {
        plans: largePlansArray,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.plans).toEqual(largePlansArray)
    })

    it('should handle minimum and maximum values for lives', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        minLives: 1,
        maxLives: 1,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.minLives).toBe(1)
      expect(body.data.maxLives).toBe(1)
    })

    it('should handle minimum and maximum values for value field', async () => {
      const createdCampaign = await createTestCampaign()

      // Testar valor mínimo
      const updatePayload1 = {
        value: 1,
      }

      const response1 = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload1,
      })

      expect(response1.statusCode).toBe(200)

      // Testar valor máximo
      const updatePayload2 = {
        value: 100,
      }

      const response2 = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload2,
      })

      expect(response2.statusCode).toBe(200)

      const body2 = JSON.parse(response2.body)
      expect(body2.data.value).toBe(100)
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

  describe('PATCH /api/campaigns/:id - Content Type Tests', () => {
    it('should return 400 when content-type is not application/json', async () => {
      const createdCampaign = await createTestCampaign()

      const updatePayload = {
        name: 'Updated Name',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/campaigns/${createdCampaign.id}`,
        headers: {
          authorization: getAuthHeaders().authorization,
          'content-type': 'text/plain',
        },
        payload: JSON.stringify(updatePayload),
      })

      // Pode retornar 400 ou 415 dependendo da configuração do Fastify
      expect([400, 415]).toContain(response.statusCode)
    })
  })
})
