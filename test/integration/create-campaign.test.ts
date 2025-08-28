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
    }
  }

  // Payload válido atualizado com rules obrigatórias
  const getValidCampaignPayload = () => ({
    name: 'Test Campaign - Create',
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
    console.log('✅ Conectado ao banco MySQL para testes de criação')
  })

  beforeEach(async () => {
    // Limpar campanhas e rules existentes antes de cada teste
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

  describe('POST /api/campaigns - Success Cases', () => {
    it('should allow creating a specific campaign if a default campaign already exists', async () => {
      const payload = {...getValidCampaignPayload(), isDefault: true}

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      const payloadIsDefaultFalse = {...getValidCampaignPayload(), isDefault: false}

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: payloadIsDefaultFalse,
      })

      expect(response.statusCode).toBe(201)
    })

    it('should return 409 when trying to create a specific campaign in the same period if one already exists', async () => {
      const payload = {...getValidCampaignPayload(), isDefault: false}

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      const payloadIsDefaultFalse = {...getValidCampaignPayload(), isDefault: false}

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: payloadIsDefaultFalse,
      })

      expect(response.statusCode).toBe(409)
    })

    it('should create a campaign successfully with all required fields including rules', async () => {
      const payload = getValidCampaignPayload()

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.id).toBeDefined()
      expect(body.data.name).toBe(payload.name)
      expect(body.data.isDefault).toBe(payload.isDefault)
      expect(body.data.status).toBe(payload.status)
      expect(body.data.createdAt).toBeDefined()
      expect(body.data.updatedAt).toBeDefined()

      // Verificar que as rules foram criadas
      expect(body.data.rules).toBeDefined()
      expect(Array.isArray(body.data.rules)).toBe(true)
      expect(body.data.rules).toHaveLength(1)

      const rule = body.data.rules[0]
      const expectedRule = payload.rules[0]
      expect(rule.id).toBeDefined()
      expect(rule.minLives).toBe(expectedRule.minLives)
      expect(rule.maxLives).toBe(expectedRule.maxLives)
      expect(rule.plans).toEqual(expectedRule.plans)
      expect(rule.value).toBe(expectedRule.value)
      expect(rule.paymentMethod).toEqual(expectedRule.paymentMethod)
      expect(rule.accommodation).toEqual(expectedRule.accommodation)
      expect(rule.typeProduct).toEqual(expectedRule.typeProduct)
      expect(rule.obstetrics).toEqual(expectedRule.obstetrics)
      expect(rule.createdAt).toBeDefined()
      expect(rule.updatedAt).toBeDefined()

      // Verificar se foi realmente criado no banco
      const createdCampaign = await prisma.campaign.findFirst({
        where: { name: payload.name },
        include: { rules: true },
      })
      expect(createdCampaign).toBeDefined()
      expect(createdCampaign?.name).toBe(payload.name)
      expect(createdCampaign?.rules).toHaveLength(1)
    })

    it('should create a campaign with multiple rules', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: 'Campaign with Multiple Rules',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-06-30T23:59:59.000Z',
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
          {
            minLives: 16,
            maxLives: 30,
            plans: [1, 2, 3, 4, 5],
            value: 30,
            paymentMethod: ['PIX', 'CREDITCARD', 'BANKSLIP'],
            accommodation: ['APARTMENT', 'INFIRMARY'],
            typeProduct: ['withParticipation'],
            obstetrics: ['withObstetric'],
          },
        ],
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.rules).toHaveLength(3)

      // Verificar no banco
      const createdCampaign = await prisma.campaign.findFirst({
        where: { name: payload.name },
        include: { rules: true },
      })
      expect(createdCampaign?.rules).toHaveLength(3)
    })

    it('should create a campaign with isDefault set to true', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        isDefault: true,
        name: 'Default Campaign Test',
        startDate: '2025-07-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.isDefault).toBe(true)
    })

    it('should create a campaign with minimal valid data', async () => {
      const payload = {
        name: 'Minimal Campaign',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-02T00:00:00.000Z',
        rules: [
          {
            minLives: 1,
            maxLives: 1,
            plans: [1],
            value: 1,
            paymentMethod: ['PIX'],
            accommodation: ['APARTMENT'],
            typeProduct: ['withParticipation'],
            obstetrics: ['withObstetric'],
          },
        ],
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe(payload.name)
      expect(body.data.rules).toHaveLength(1)
    })

    it('should create a campaign with maximum valid data', async () => {
      const payload = {
        name: 'A'.repeat(255), // máximo de caracteres
        startDate: '2026-02-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        isDefault: false,
        status: 'ACTIVE',
        rules: [
          {
            minLives: 1,
            maxLives: 1000,
            plans: [1, 2, 3, 4, 5, 10, 15, 20, 25, 30],
            value: 100,
            paymentMethod: ['PIX', 'BANKSLIP', 'CREDITCARD'],
            accommodation: ['APARTMENT', 'INFIRMARY'],
            typeProduct: ['withParticipation', 'withoutParticipation'],
            obstetrics: ['withObstetric', 'withoutObstetric'],
          },
        ],
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.rules[0].value).toBe(100)
      expect(body.data.rules[0].plans).toEqual(payload.rules[0].plans)
    })
  })

  describe('POST /api/campaigns - Validation Errors (400)', () => {
    it('should return 400 when rules array is missing', async () => {
      const payload = {
        name: 'Campaign without rules',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
        // rules não informado
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('rules')
    })

    it('should return 400 when rules array is empty', async () => {
      const payload = {
        name: 'Campaign with empty rules',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
        rules: [], // Array vazio
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('must NOT have fewer than 1 items')
    })

    it('should return 400 when rule is missing required fields', async () => {
      const payload = {
        name: 'Campaign with incomplete rule',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
        rules: [
          {
            minLives: 5,
            // maxLives não informado
            plans: [1, 2, 3],
            value: 15,
            paymentMethod: ['PIX'],
            accommodation: ['APARTMENT'],
            typeProduct: ['withParticipation'],
            obstetrics: ['withObstetric'],
          },
        ],
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('maxLives')
    })

    it('should return 400 when rule value is out of range', async () => {
      const payloadTooLow = {
        ...getValidCampaignPayload(),
        rules: [
          {
            ...getValidCampaignPayload().rules[0],
            value: 0, // Valor muito baixo
          },
        ],
      }

      const response1 = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: payloadTooLow,
      })

      expect(response1.statusCode).toBe(400)

      const payloadTooHigh = {
        ...getValidCampaignPayload(),
        rules: [
          {
            ...getValidCampaignPayload().rules[0],
            value: 101, // Valor muito alto
          },
        ],
      }

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: payloadTooHigh,
      })

      expect(response2.statusCode).toBe(400)
    })

    it('should return 400 when rule plans array is empty', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        rules: [
          {
            ...getValidCampaignPayload().rules[0],
            plans: [], // Array vazio
          },
        ],
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when rule plans contains invalid values', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        rules: [
          {
            ...getValidCampaignPayload().rules[0],
            plans: [1, 0, -1], // Contém valores inválidos
          },
        ],
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when name is missing', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: undefined,
      }
      delete payload.name

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when name is empty string', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: '',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when name is too long', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: 'A'.repeat(256), // 256 caracteres, maior que o limite de 255
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 when startDate is invalid', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        startDate: 'invalid-date',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
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
          'content-type': 'application/json',
        },
        payload,
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
          'content-type': 'application/json',
        },
        payload,
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/campaigns - Business Logic Tests', () => {
    it('should handle concurrent campaign creation requests', async () => {
      const currentDate = new Date()

      const payload1 = {
        ...getValidCampaignPayload(),
        name: 'Concurrent Campaign 1',
        startDate: new Date(
          currentDate.getTime() + 1 * 24 * 60 * 60 * 1000
        ).toISOString(), // +1 dia
        endDate: new Date(
          currentDate.getTime() + 31 * 24 * 60 * 60 * 1000
        ).toISOString(), // +31 dias
      }

      const payload2 = {
        ...getValidCampaignPayload(),
        name: 'Concurrent Campaign 2',
        startDate: new Date(
          currentDate.getTime() + 40 * 24 * 60 * 60 * 1000
        ).toISOString(), // +40 dias
        endDate: new Date(
          currentDate.getTime() + 70 * 24 * 60 * 60 * 1000
        ).toISOString(), // +70 dias
      }

      const payload3 = {
        ...getValidCampaignPayload(),
        name: 'Concurrent Campaign 3',
        startDate: new Date(
          currentDate.getTime() + 80 * 24 * 60 * 60 * 1000
        ).toISOString(), // +80 dias
        endDate: new Date(
          currentDate.getTime() + 110 * 24 * 60 * 60 * 1000
        ).toISOString(), // +110 dias
      }

      // Fazer requisições simultâneas
      const requests = [
        app.inject({
          method: 'POST',
          url: '/api/campaigns',
          headers: getAuthHeaders(),
          payload: payload1,
        }),
        app.inject({
          method: 'POST',
          url: '/api/campaigns',
          headers: getAuthHeaders(),
          payload: payload2,
        }),
        app.inject({
          method: 'POST',
          url: '/api/campaigns',
          headers: getAuthHeaders(),
          payload: payload3,
        }),
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
            in: [
              'Concurrent Campaign 1',
              'Concurrent Campaign 2',
              'Concurrent Campaign 3',
            ],
          },
        },
        include: { rules: true },
      })

      expect(campaignsInDb).toHaveLength(3)
      campaignsInDb.forEach(campaign => {
        expect(campaign.rules).toHaveLength(1)
      })

      // Verificar que as datas são diferentes para evitar sobreposição
      const sortedCampaigns = campaignsInDb.sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime()
      )
      expect(sortedCampaigns[0].endDate.getTime()).toBeLessThan(
        sortedCampaigns[1].startDate.getTime()
      )
      expect(sortedCampaigns[1].endDate.getTime()).toBeLessThan(
        sortedCampaigns[2].startDate.getTime()
      )
    })

    it('should handle special characters in campaign name', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: 'Campaign with Special Chars: àáâãäçéêëíîïóôõöúûüý @#$%&*()[]{}!?',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe(payload.name)
    })

    it('should trim whitespace from campaign name', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: '   Campaign with Whitespace   ',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Campaign with Whitespace')
    })
  })

  describe('POST /api/campaigns - Edge Cases', () => {
    it('should handle campaigns with very long duration', async () => {
      const payload = {
        ...getValidCampaignPayload(),
        name: 'Long Duration Campaign',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2030-12-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })
  })

  describe('POST /api/campaigns - Date Overlap Validation Tests', () => {
    it('should reject campaign creation when dates overlap with existing campaign - exact same dates', async () => {
      // Primeiro, criar uma campanha existente
      const existingCampaign = {
        ...getValidCampaignPayload(),
        name: 'Existing Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      }

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: existingCampaign,
      })

      // Tentar criar nova campanha com exatamente as mesmas datas
      const newCampaign = {
        ...getValidCampaignPayload(),
        name: 'New Campaign - Same Dates',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: newCampaign,
      })

      expect(response.statusCode).toBe(409)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Date Overlap Error')
      expect(body.message).toContain('está em conflito com a campanha')
      expect(body.message).toContain('Existing Campaign')
    })

    it('should reject campaign creation when new campaign starts during existing campaign', async () => {
      // Criar campanha existente
      const existingCampaign = {
        ...getValidCampaignPayload(),
        name: 'Existing Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      }

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: existingCampaign,
      })

      // Nova campanha que começa durante a existente
      const newCampaign = {
        ...getValidCampaignPayload(),
        name: 'New Campaign - Start Overlap',
        startDate: '2024-07-15T00:00:00.000Z',
        endDate: '2024-10-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: newCampaign,
      })

      expect(response.statusCode).toBe(409)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Date Overlap Error')
    })

    it('should reject campaign creation when new campaign ends during existing campaign', async () => {
      // Criar campanha existente
      const existingCampaign = {
        ...getValidCampaignPayload(),
        name: 'Existing Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      }

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: existingCampaign,
      })

      // Nova campanha que termina durante a existente
      const newCampaign = {
        ...getValidCampaignPayload(),
        name: 'New Campaign - End Overlap',
        startDate: '2024-04-01T00:00:00.000Z',
        endDate: '2024-07-15T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: newCampaign,
      })

      expect(response.statusCode).toBe(409)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Date Overlap Error')
    })

    it('should reject campaign creation when new campaign completely encompasses existing campaign', async () => {
      // Criar campanha existente
      const existingCampaign = {
        ...getValidCampaignPayload(),
        name: 'Existing Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      }

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: existingCampaign,
      })

      // Nova campanha que engloba completamente a existente
      const newCampaign = {
        ...getValidCampaignPayload(),
        name: 'New Campaign - Encompasses Existing',
        startDate: '2024-04-01T00:00:00.000Z',
        endDate: '2024-10-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: newCampaign,
      })

      expect(response.statusCode).toBe(409)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Date Overlap Error')
    })

    it('should reject campaign creation when existing campaign completely encompasses new campaign', async () => {
      // Criar campanha existente maior
      const existingCampaign = {
        ...getValidCampaignPayload(),
        name: 'Existing Campaign',
        startDate: '2024-04-01T00:00:00.000Z',
        endDate: '2024-10-31T23:59:59.000Z',
      }

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: existingCampaign,
      })

      // Nova campanha menor, completamente dentro da existente
      const newCampaign = {
        ...getValidCampaignPayload(),
        name: 'New Campaign - Inside Existing',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: newCampaign,
      })

      expect(response.statusCode).toBe(409)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Date Overlap Error')
    })

    it('should allow campaign creation when dates do not overlap - before existing campaign', async () => {
      // Criar campanha existente
      const existingCampaign = {
        ...getValidCampaignPayload(),
        name: 'Existing Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      }

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: existingCampaign,
      })

      // Nova campanha que termina antes da existente começar
      const newCampaign = {
        ...getValidCampaignPayload(),
        name: 'New Campaign - Before Existing',
        startDate: '2024-04-01T00:00:00.000Z',
        endDate: '2024-05-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: newCampaign,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe(newCampaign.name)
    })

    it('should allow campaign creation when dates do not overlap - after existing campaign', async () => {
      // Criar campanha existente
      const existingCampaign = {
        ...getValidCampaignPayload(),
        name: 'Existing Campaign',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      }

      await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: existingCampaign,
      })

      // Nova campanha que começa depois da existente terminar
      const newCampaign = {
        ...getValidCampaignPayload(),
        name: 'New Campaign - After Existing',
        startDate: '2024-09-01T00:00:00.000Z',
        endDate: '2024-11-30T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: newCampaign,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe(newCampaign.name)
    })

    it('should not consider deleted campaigns for overlap validation', async () => {
      // Criar campanha
      const existingCampaign = {
        ...getValidCampaignPayload(),
        name: 'Campaign to be deleted',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      }

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: existingCampaign,
      })

      const createdCampaign = JSON.parse(createResponse.body)
      const campaignId = createdCampaign.data.id

      // Deletar a campanha
      await app.inject({
        method: 'DELETE',
        url: `/api/campaigns/${campaignId}`,
        headers: getAuthHeaders(),
      })

      const newCampaign = {
        ...getValidCampaignPayload(),
        name: 'New Campaign - Same Dates as Deleted',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-08-31T23:59:59.000Z',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
        payload: newCampaign,
      })

      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe(newCampaign.name)
    })
  })
})
