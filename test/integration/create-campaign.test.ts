import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'
import { PrismaClient } from '@prisma/client'
import { env } from '../../src/config/env.js'

describe('Create Campaign Integration Tests', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  
  // Helper function para criar headers de autorização
  const getAuthHeaders = () => {
    const authKey = env.BEARER_AUTH_KEY?.split(',')[0] || 'test-token'
    return {
      authorization: `Bearer ${authKey}`,
      'content-type': 'application/json'
    }
  }

  // Helper function para criar payload válido de campanha
  const getValidCampaignPayload = () => ({
    name: 'Test Campaign - Create',
    startDate: '2024-06-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.000Z',
    minLives: 5,
    maxLives: 20,
    plans: [1, 2, 3],
    value: 15
  })

  beforeAll(async () => {
    // Criar aplicação Fastify
    app = await createApp()
    
    // Conectar ao banco MySQL do docker-compose
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'mysql://campaign_user:campaign_password@localhost:3306/campaigns'
        }
      }
    })

    // Aguardar conexão
    await prisma.$connect()
    console.log('✅ Conectado ao banco MySQL para testes de criação')
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

  describe('POST /api/campaigns - Success Cases', () => {
    it('should create a campaign successfully with all required fields', async () => {
      const payload = getValidCampaignPayload()

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(201)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.id).toBeDefined()
      expect(body.data.name).toBe(payload.name)
      expect(body.data.minLives).toBe(payload.minLives)
      expect(body.data.maxLives).toBe(payload.maxLives)
      expect(body.data.plans).toEqual(payload.plans)
      expect(body.data.value).toBe(payload.value)
      expect(body.data.isDefault).toBe(false) // default value
      expect(body.data.createdAt).toBeDefined()
      expect(body.data.updatedAt).toBeDefined()

      // Verificar se foi realmente criado no banco
      const createdCampaign = await prisma.campaign.findFirst({
        where: { name: payload.name }
      })
      expect(createdCampaign).toBeDefined()
      expect(createdCampaign?.name).toBe(payload.name)
    })

    it('should create a campaign with isDefault set to true', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        isDefault: true,
        name: 'Default Campaign Test'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(201)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.isDefault).toBe(true)
    })

    it('should create a campaign with minimal valid data', async () => {
      const payload = {
        name: 'Minimal Campaign',
        startDate: '2024-07-01T00:00:00.000Z',
        endDate: '2024-07-02T00:00:00.000Z',
        minLives: 1,
        maxLives: 1,
        plans: [1],
        value: 1
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(201)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe(payload.name)
    })

    it('should create a campaign with maximum valid data', async () => {
      const payload = {
        name: 'A'.repeat(255), // máximo de caracteres
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.000Z',
        isDefault: false,
        minLives: 1,
        maxLives: 1000,
        plans: [1, 2, 3, 4, 5, 10, 15, 20, 25, 30],
        value: 100
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(201)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.value).toBe(100)
      expect(body.data.plans).toEqual(payload.plans)
    })
  })

  describe('POST /api/campaigns - Validation Errors (400)', () => {
    it('should return 400 when name is missing', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: undefined
      }
      delete payload.name

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when name is empty string', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: ''
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when name is too long', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: 'A'.repeat(256) // 256 caracteres, maior que o limite de 255
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when startDate is invalid', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        startDate: 'invalid-date'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when endDate is before startDate', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        startDate: '2024-12-31T00:00:00.000Z',
        endDate: '2024-01-01T00:00:00.000Z'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('before')
    })

    it('should return 400 when minLives is zero or negative', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        minLives: 0
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when maxLives is less than minLives', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        minLives: 10,
        maxLives: 5
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('greater than maximum')
    })

    it('should return 400 when value is out of range', async () => {
      const payloadTooLow = {
        ...getValidCampaignPayload(),
        value: 0
      }

      const response1 = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: payloadTooLow
      })

      expect(response1.statusCode).toBe(400)

      const payloadTooHigh = {
        ...getValidCampaignPayload(),
        value: 101
      }

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: payloadTooHigh
      })

      expect(response2.statusCode).toBe(400)
    })

    it('should return 400 when plans array is empty', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        plans: []
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when plans contains invalid values', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        plans: [1, 0, -1]
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /api/campaigns - Authentication Tests', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const payload = getValidCampaignPayload()

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: {
          'content-type': 'application/json'
        },
        payload
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 when invalid token is provided', async () => {
      const payload = getValidCampaignPayload()

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: {
          authorization: 'Bearer invalid-token',
          'content-type': 'application/json'
        },
        payload
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/campaigns - Content Type Tests', () => {
    it('should return 400 when content-type is not application/json', async () => {
      const payload = getValidCampaignPayload()

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: {
          authorization: getAuthHeaders().authorization,
          'content-type': 'text/plain'
        },
        payload: JSON.stringify(payload)
      })

      // Pode retornar 400 ou 415 dependendo da configuração do Fastify
      expect([400, 415]).toContain(response.statusCode)
    })
  })

  describe('POST /api/campaigns - Business Logic Tests', () => {
    it('should handle concurrent campaign creation requests', async () => {
      const payload1 = {
        ...getValidCampaignPayload(),
        name: 'Concurrent Campaign 1'
      }

      const payload2 = {
        ...getValidCampaignPayload(),
        name: 'Concurrent Campaign 2'
      }

      const payload3 = {
        ...getValidCampaignPayload(),
        name: 'Concurrent Campaign 3'
      }

      // Fazer requisições simultâneas
      const requests = [
        app.inject({
          method: 'POST',
          url: '/api/campaigns',
          headers: getAuthHeaders(),
          payload: payload1
        }),
        app.inject({
          method: 'POST',
          url: '/api/campaigns',
          headers: getAuthHeaders(),
          payload: payload2
        }),
        app.inject({
          method: 'POST',
          url: '/api/campaigns',
          headers: getAuthHeaders(),
          payload: payload3
        })
      ]

      const responses = await Promise.all(requests)

      // Todas devem retornar sucesso
      responses.forEach(response => {
        expect(response.statusCode).toBe(201)
        
        const body = JSON.parse(response.body)
        expect(body.success).toBe(true)
        expect(body.data.id).toBeDefined()
      })

      // Verificar se todas foram criadas no banco
      const campaignsInDb = await prisma.campaign.findMany({
        where: {
          name: {
            in: ['Concurrent Campaign 1', 'Concurrent Campaign 2', 'Concurrent Campaign 3']
          }
        }
      })

      expect(campaignsInDb).toHaveLength(3)
    })

    it('should handle special characters in campaign name', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: 'Campaign with Special Chars: àáâãäçéêëíîïóôõöúûüý @#$%&*()[]{}!?'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(201)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe(payload.name)
    })

    it('should handle large plans array', async () => {
      const largePlansArray = Array.from({ length: 100 }, (_, i) => i + 1)
      
      const payload = {
        ...getValidCampaignPayload(),
        name: 'Campaign with Large Plans Array',
        plans: largePlansArray
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(201)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.plans).toEqual(largePlansArray)
    })

    it('should trim whitespace from campaign name', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: '   Campaign with Whitespace   '
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(201)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Campaign with Whitespace')
    })
  })

  describe('POST /api/campaigns - Edge Cases', () => {
    it('should handle exactly equal start and end dates (should fail)', async () => {
      const sameDate = '2024-06-01T12:00:00.000Z'
      const payload = {
        ...getValidCampaignPayload(),
        startDate: sameDate,
        endDate: sameDate
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(400)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('before')
    })

    it('should handle campaigns with very long duration', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: 'Long Duration Campaign',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2030-12-31T23:59:59.000Z'
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload
      })

      expect(response.statusCode).toBe(201)
      
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })
  })
})
