import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'
import { PrismaClient } from '@prisma/client'
import { env } from '../../src/config/env.js'

describe('Update Rule - Success Tests', () => {
  let app: FastifyInstance
  let prisma: PrismaClient

  const getAuthHeaders = () => {
    const authKey = env.BEARER_AUTH_KEY?.split(',')[0] || 'test-token'
    return {
      authorization: `Bearer ${authKey}`,
      'content-type': 'application/json',
    }
  }

  const getValidCampaignPayload = () => ({
    name: 'Test Campaign - Rule Update Success',
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

  const createTestCampaign = async () => {
    const payload = getValidCampaignPayload()

    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns',
      headers: getAuthHeaders(),
      payload,
    })

    expect(response.statusCode).toBe(201)
    const responseBody = JSON.parse(response.body)

    return {
      campaign: responseBody.data,
      rule: responseBody.data.rules[0],
    }
  }

  beforeAll(async () => {
    app = await createApp()
    await app.ready()

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
    })
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.rule.deleteMany({
      where: {
        campaign: {
          name: {
            contains: 'Test Campaign - Rule Update Success',
          },
        },
      },
    })

    await prisma.campaign.deleteMany({
      where: {
        name: {
          contains: 'Test Campaign - Rule Update Success',
        },
      },
    })
  })

  describe('PATCH /api/rules/:id - Success Cases', () => {
    it('deve atualizar apenas um campo (value) mantendo os demais inalterados', async () => {
      const { rule } = await createTestCampaign()

      const updatePayload = {
        value: 25,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const responseBody = JSON.parse(response.body)
      expect(responseBody.success).toBe(true)
      expect(responseBody.data).toBeDefined()

      const updatedRule = responseBody.data
      expect(updatedRule.id).toBe(rule.id)
      expect(updatedRule.value).toBe(25)

      expect(updatedRule.minLives).toBe(rule.minLives)
      expect(updatedRule.maxLives).toBe(rule.maxLives)
      expect(updatedRule.plans).toEqual(rule.plans)
      expect(updatedRule.paymentMethod).toEqual(rule.paymentMethod)
      expect(updatedRule.accommodation).toEqual(rule.accommodation)
      expect(updatedRule.typeProduct).toEqual(rule.typeProduct)
      expect(updatedRule.obstetrics).toEqual(rule.obstetrics)
    })

    it('deve atualizar múltiplos campos preservando os não enviados', async () => {
      const { rule } = await createTestCampaign()

      const updatePayload = {
        minLives: 10,
        maxLives: 50,
        value: 30,
        paymentMethod: ['PIX'],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const responseBody = JSON.parse(response.body)
      expect(responseBody.success).toBe(true)

      const updatedRule = responseBody.data
      expect(updatedRule.minLives).toBe(10)
      expect(updatedRule.maxLives).toBe(50)
      expect(updatedRule.value).toBe(30)
      expect(updatedRule.paymentMethod).toEqual(['PIX'])

      expect(updatedRule.plans).toEqual(rule.plans)
      expect(updatedRule.accommodation).toEqual(rule.accommodation)
      expect(updatedRule.typeProduct).toEqual(rule.typeProduct)
      expect(updatedRule.obstetrics).toEqual(rule.obstetrics)
    })

    it('deve atualizar todos os campos da rule com sucesso', async () => {
      const { rule } = await createTestCampaign()

      const updatePayload = {
        minLives: 1,
        maxLives: 100,
        plans: [4, 5, 6],
        value: 50,
        paymentMethod: ['BANKSLIP'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const responseBody = JSON.parse(response.body)
      expect(responseBody.success).toBe(true)

      const updatedRule = responseBody.data
      expect(updatedRule.minLives).toBe(1)
      expect(updatedRule.maxLives).toBe(100)
      expect(updatedRule.plans).toEqual([4, 5, 6])
      expect(updatedRule.value).toBe(50)
      expect(updatedRule.paymentMethod).toEqual(['BANKSLIP'])
      expect(updatedRule.accommodation).toEqual(['INFIRMARY'])
      expect(updatedRule.typeProduct).toEqual(['withoutParticipation'])
      expect(updatedRule.obstetrics).toEqual(['withoutObstetric'])
    })

    it('deve atualizar arrays com múltiplos valores', async () => {
      const { rule } = await createTestCampaign()

      const updatePayload = {
        paymentMethod: ['PIX', 'BANKSLIP', 'CREDITCARD'],
        accommodation: ['INFIRMARY', 'APARTMENT'],
        typeProduct: ['withParticipation', 'withoutParticipation'],
        obstetrics: ['withObstetric', 'withoutObstetric'],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const responseBody = JSON.parse(response.body)
      expect(responseBody.success).toBe(true)

      const updatedRule = responseBody.data
      expect(updatedRule.paymentMethod).toEqual([
        'PIX',
        'BANKSLIP',
        'CREDITCARD',
      ])
      expect(updatedRule.accommodation).toEqual(['INFIRMARY', 'APARTMENT'])
      expect(updatedRule.typeProduct).toEqual([
        'withParticipation',
        'withoutParticipation',
      ])
      expect(updatedRule.obstetrics).toEqual([
        'withObstetric',
        'withoutObstetric',
      ])
    })

    it('deve preservar timestamps e IDs na atualização', async () => {
      const { rule } = await createTestCampaign()
      const originalCreatedAt = rule.createdAt

      const updatePayload = {
        value: 40,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(200)

      const responseBody = JSON.parse(response.body)
      const updatedRule = responseBody.data

      expect(updatedRule.id).toBe(rule.id)
      expect(updatedRule.campaignId).toBe(rule.campaignId)

      expect(updatedRule.createdAt).toBe(originalCreatedAt)

      expect(new Date(updatedRule.updatedAt)).toBeInstanceOf(Date)
      expect(new Date(updatedRule.updatedAt).getTime()).toBeGreaterThan(
        new Date(rule.updatedAt).getTime()
      )
    })
  })

  describe('PATCH /api/rules/:id - Failure Cases', () => {
    it('deve retornar 404 quando a rule não existir', async () => {
      const nonExistentRuleId = '999999'

      const updatePayload = {
        value: 25,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${nonExistentRuleId}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(404)

      const responseBody = JSON.parse(response.body)
      expect(responseBody.success).toBe(false)
      expect(responseBody.error).toBe('Not Found')
      expect(responseBody.message).toBe('Rule not found')
    })

    it('deve retornar 400 quando não enviar nenhum campo para atualizar', async () => {
      const { rule } = await createTestCampaign()

      const updatePayload = {}

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(400)

      const responseBody = JSON.parse(response.body)
      expect(responseBody.success).toBe(false)
    })

    it('deve retornar 400 quando minLives for negativo', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        minLives: -1,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)

      const responseBody = JSON.parse(response.body)
      expect(responseBody.success).toBe(false)
    })

    it('deve retornar 400 quando maxLives for negativo', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        maxLives: 0,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando value estiver fora do range (menor que 1)', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        value: 0,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando value estiver fora do range (maior que 100)', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        value: 150,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando plans for array vazio', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        plans: [],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando plans contiver valores negativos', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        plans: [1, -2, 3],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando paymentMethod contiver valores inválidos', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        paymentMethod: ['PIX', 'INVALID_METHOD'],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando accommodation contiver valores inválidos', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        accommodation: ['APARTMENT', 'INVALID_ACCOMMODATION'],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando typeProduct contiver valores inválidos', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        typeProduct: ['withParticipation', 'invalidType'],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando obstetrics contiver valores inválidos', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        obstetrics: ['withObstetric', 'invalidObstetric'],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 401 quando não fornecido token de autorização', async () => {
      const { rule } = await createTestCampaign()

      const updatePayload = {
        value: 25,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: {
          'content-type': 'application/json',
        },
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(401)
    })

    it('deve retornar 401 quando token de autorização for inválido', async () => {
      const { rule } = await createTestCampaign()

      const updatePayload = {
        value: 25,
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: {
          authorization: 'Bearer invalid-token',
          'content-type': 'application/json',
        },
        payload: updatePayload,
      })

      expect(response.statusCode).toBe(401)
    })

    it('deve retornar 400 quando enviar campos com tipos incorretos', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        minLives: 'texto-invalido',
        value: 'não-é-número',
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando enviar array vazio para paymentMethod', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        paymentMethod: [],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve retornar 400 quando enviar array vazio para accommodation', async () => {
      const { rule } = await createTestCampaign()

      const invalidPayload = {
        accommodation: [],
      }

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rules/${rule.id}`,
        headers: getAuthHeaders(),
        payload: invalidPayload,
      })

      expect(response.statusCode).toBe(400)
    })
  })
})
