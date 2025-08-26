import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'
import { PrismaClient } from '@prisma/client'
import { env } from '../../src/config/env.js'

describe('Get Active Campaign Integration Tests', () => {
  let app: FastifyInstance
  let prisma: PrismaClient

  // Helper function para criar headers de autorização
  const getAuthHeaders = () => {
    const authKey = env.BEARER_AUTH_KEY?.split(',')[0] || 'test-token'
    return {
      authorization: `Bearer ${authKey}`,
    }
  }

  // Helper function para criar campanha específica
  const createSpecificCampaign = async (
    name: string,
    startDate: Date,
    endDate: Date
  ) => {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        startDate,
        endDate,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: campaign.id,
        minLives: 5,
        maxLives: 20,
        plans: [1, 2, 3],
        value: 15,
        paymentMethod: ['PIX', 'CREDITCARD'],
        accommodation: ['APARTMENT'],
        typeProduct: ['withParticipation'],
        obstetrics: ['withObstetric'],
      },
    })

    return campaign
  }

  // Helper function para criar campanha padrão
  const createDefaultCampaign = async (
    name: string,
    startDate: Date,
    endDate: Date
  ) => {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        startDate,
        endDate,
        isDefault: true,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: campaign.id,
        minLives: 1,
        maxLives: 10,
        plans: [1, 2],
        value: 10,
        paymentMethod: ['PIX'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    return campaign
  }

  beforeAll(async () => {
    // Criar aplicação Fastify
    app = await createApp()

    // Conectar ao banco MySQL
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
  })

  beforeEach(async () => {
    // Limpar dados existentes antes de cada teste
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()
  })

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()

    // Desconectar
    await prisma.$disconnect()

    // Fechar aplicação
    await app.close()
  })

  describe('GET /api/campaigns/active - Success Cases (200)', () => {
    it('should return specific campaign when both specific and default are active (2nd priority)', async () => {
      const now = new Date()
      const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 dias atrás
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias no futuro

      // Criar campanha específica ativa
      const specificCampaign = await createSpecificCampaign(
        'Campanha Específica',
        startDate,
        endDate
      )

      // Criar campanha padrão ativa
      await createDefaultCampaign('Campanha Padrão', startDate, endDate)

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.id).toBe(specificCampaign.id.toString())
      expect(body.data.name).toBe('Campanha Específica')
      expect(body.data.isDefault).toBe(false)
      expect(body.data.rules).toHaveLength(1)
    })

    it('should return default campaign when no specific campaign is active (3rd priority)', async () => {
      const now = new Date()
      const activeStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const activeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Criar apenas campanha padrão ativa
      const defaultCampaign = await createDefaultCampaign(
        'Campanha Padrão Única',
        activeStart,
        activeEnd
      )

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.id).toBe(defaultCampaign.id.toString())
      expect(body.data.name).toBe('Campanha Padrão Única')
      expect(body.data.isDefault).toBe(true)
      expect(body.data.rules).toHaveLength(1)
    })

    it('should return specific campaign by proposalDate within 30 days (1st priority)', async () => {
      const now = new Date()
      const proposalDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 dias atrás

      // Campanha específica que estava ativa na proposalDate (mas já expirou, dentro dos 30 dias)
      const expiredStart = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 dias atrás
      const expiredEnd = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 dias atrás
      const expiredCampaign = await createSpecificCampaign(
        'Campanha Específica Expirada',
        expiredStart,
        expiredEnd
      )

      // Campanha específica ativa atualmente
      const currentStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await createSpecificCampaign(
        'Campanha Específica Atual',
        currentStart,
        currentEnd
      )

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.id).toBe(expiredCampaign.id.toString())
      expect(body.data.name).toBe('Campanha Específica Expirada')
      expect(body.data.isDefault).toBe(false)
    })

    it('should return 404 when proposalDate has no specific campaign active on that date', async () => {
      const now = new Date()
      const proposalDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) // 60 dias atrás (nenhuma campanha ativa)

      // Campanha específica ativa atualmente (não será considerada pois proposalDate é obrigatório encontrar campanha)
      const currentStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await createSpecificCampaign(
        'Campanha Específica Atual',
        currentStart,
        currentEnd
      )

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('No active campaign found')
    })

    it('should return 404 when proposalDate specific campaign is outside 30-day window', async () => {
      const now = new Date()
      const proposalDate = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000) // 50 dias atrás

      // Campanha específica que estava ativa na proposalDate mas está fora dos 30 dias
      const oldStart = new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000)
      const oldEnd = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
      await createSpecificCampaign(
        'Campanha Específica Muito Antiga',
        oldStart,
        oldEnd
      )

      // Campanha padrão ativa atualmente (não será considerada pois proposalDate é obrigatório)
      const currentStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await createDefaultCampaign(
        'Campanha Padrão Atual',
        currentStart,
        currentEnd
      )

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('No active campaign found')
    })

    it('should return proper campaign structure with all fields and rules', async () => {
      const now = new Date()
      const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      await createSpecificCampaign(
        'Test Campaign Structure',
        startDate,
        endDate
      )

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        startDate: expect.any(String),
        endDate: expect.any(String),
        isDefault: expect.any(Boolean),
        status: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        rules: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            minLives: expect.any(Number),
            maxLives: expect.any(Number),
            plans: expect.any(Array),
            value: expect.any(Number),
            paymentMethod: expect.any(Array),
            accommodation: expect.any(Array),
            typeProduct: expect.any(Array),
            obstetrics: expect.any(Array),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        ]),
      })
    })
  })

  describe('GET /api/campaigns/active - Error Cases', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toContain('missing authorization header')
    })

    it('should return 401 when invalid token is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 400 when proposalDate has invalid format (schema validation)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active?proposalDate=invalid-date',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Validation Error')
      expect(body.message).toBeDefined()
    })

    it('should return 404 when no active campaigns exist', async () => {
      // Criar apenas campanhas inativas/expiradas
      const now = new Date()
      const expiredStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      const expiredEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      await createSpecificCampaign(
        'Campanha Expirada',
        expiredStart,
        expiredEnd
      )

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('No active campaign found')
    })
  })

  describe('GET /api/campaigns/active - Business Rules Priority', () => {
    it('should prioritize proposalDate over current specific campaign', async () => {
      const now = new Date()
      const proposalDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)

      // Campanha específica que estava ativa na proposalDate
      const proposalStart = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)
      const proposalEnd = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      const proposalCampaign = await createSpecificCampaign(
        'Campanha da Proposal',
        proposalStart,
        proposalEnd
      )

      // Campanha específica ativa atualmente
      const currentStart = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await createSpecificCampaign('Campanha Atual', currentStart, currentEnd)

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.id).toBe(proposalCampaign.id.toString())
      expect(body.data.name).toBe('Campanha da Proposal')
    })

    it('should prioritize specific campaign over default campaign', async () => {
      const now = new Date()
      const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Criar campanha padrão ativa
      await createDefaultCampaign('Campanha Padrão', startDate, endDate)

      // Criar campanha específica ativa
      const specificCampaign = await createSpecificCampaign(
        'Campanha Específica',
        startDate,
        endDate
      )

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.id).toBe(specificCampaign.id.toString())
      expect(body.data.name).toBe('Campanha Específica')
      expect(body.data.isDefault).toBe(false)
    })

    it('should only consider specific campaigns for proposalDate (not default) and return 404 if none found', async () => {
      const now = new Date()
      const proposalDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)

      // Campanha padrão que estava ativa na proposalDate (mas não é considerada para proposalDate)
      const proposalStart = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)
      const proposalEnd = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      await createDefaultCampaign(
        'Campanha Padrão da Proposal',
        proposalStart,
        proposalEnd
      )

      // Campanha específica ativa atualmente (não será considerada pois proposalDate deve encontrar campanha específica)
      const currentStart = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await createSpecificCampaign(
        'Campanha Específica Atual',
        currentStart,
        currentEnd
      )

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      // Deve retornar 404 pois não encontrou campanha específica na proposalDate
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('No active campaign found')
    })

    it('should apply previous campaign discount if scheduling is within 30 days after campaign end, based on proposal date and plan', async () => {
      const now = new Date('2025-10-01T00:00:00Z')

      const campaign1Start = new Date('2025-01-01T00:00:00Z')
      const campaign1End = new Date('2025-09-30T23:59:59Z')
      const campaign1 = await createSpecificCampaign(
        'Campanha 1',
        campaign1Start,
        campaign1End
      )

      const campaign2Start = new Date('2025-10-01T00:00:00Z')
      const campaign2End = new Date('2025-12-31T23:59:59Z')
      await createSpecificCampaign('Campanha 2', campaign2Start, campaign2End)

      const proposalDate = new Date('2025-07-08T00:00:00Z')
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe(campaign1.id.toString())
      expect(body.data.name).toBe('Campanha 1')
      expect(body.data.rules[0].plans).toContain(1)
    })

    it('should apply current campaign discount if scheduling is more than 30 days after previous campaign end', async () => {
      const campaign1Start = new Date('2025-01-01T00:00:00Z')
      const campaign1End = new Date('2025-09-30T23:59:59Z')
      await createSpecificCampaign('Campanha 1', campaign1Start, campaign1End)

      const campaign2Start = new Date('2025-10-01T00:00:00Z')
      const campaign2End = new Date('2025-12-31T23:59:59Z')
      const campaign2 = await createSpecificCampaign('Campanha 2', campaign2Start, campaign2End)

      const proposalDate = new Date('2025-07-08T00:00:00Z')
      const schedulingDate = new Date('2025-11-03T00:00:00Z')

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}&schedulingDate=${schedulingDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe(campaign2.id.toString())
      expect(body.data.name).toBe('Campanha 2')
      expect(body.data.rules[0].plans).toContain(1)
    })

    it('should return empty when no campaign is active for proposalDate and no discount applies', async () => {
      const campaign1Start = new Date('2025-01-01T00:00:00Z')
      const campaign1End = new Date('2025-09-30T23:59:59Z')
      await createSpecificCampaign('Campanha 1', campaign1Start, campaign1End)

      // Campanha 2: não existe

      const proposalDate = new Date('2025-11-08T00:00:00Z')
      const schedulingDate = new Date('2025-11-11T00:00:00Z')

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}&schedulingDate=${schedulingDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('No active campaign found')
    })

    it('should apply specific campaign discount if scheduling is within 30 days after specific campaign end and proposalDate matches', async () => {
      const campaign1Start = new Date('2025-01-01T00:00:00Z')
      const campaign1End = new Date('2025-09-30T23:59:59Z')
      await createSpecificCampaign('Campanha 1', campaign1Start, campaign1End)

      const campaign2Start = new Date('2025-08-01T00:00:00Z')
      const campaign2End = new Date('2025-08-31T23:59:59Z')
      const campaign2 = await createSpecificCampaign('Campanha 2', campaign2Start, campaign2End)

      const proposalDate = new Date('2025-08-11T00:00:00Z')
      const schedulingDate = new Date('2025-09-11T00:00:00Z')

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}&schedulingDate=${schedulingDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe(campaign2.id.toString())
      expect(body.data.name).toBe('Campanha 2')
      expect(body.data.rules[0].plans).toContain(1)
    })

  })

  describe('GET /api/campaigns/active - Edge Cases', () => {
    it('should handle multiple specific campaigns by returning the most recent one', async () => {
      const now = new Date()
      const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Criar primeira campanha específica
      await createSpecificCampaign('Primeira Específica', startDate, endDate)

      // Criar segunda campanha específica (mais recente)
      const recentCampaign = await createSpecificCampaign(
        'Segunda Específica',
        startDate,
        endDate
      )

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.id).toBe(recentCampaign.id.toString())
      expect(body.data.name).toBe('Segunda Específica')
    })

    it('should work with campaigns that have exact current date boundaries', async () => {
      const now = new Date()
      const startDate = now // Começa exatamente agora
      const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Termina em 24h

      const campaign = await createSpecificCampaign(
        'Campanha Boundary',
        startDate,
        endDate
      )

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/active',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.id).toBe(campaign.id.toString())
      expect(body.data.name).toBe('Campanha Boundary')
    })

    it('should handle proposalDate within 30-day window', async () => {
      const now = new Date()
      const proposalDate = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000) // 27 dias atrás

      // Campanha que terminou há 25 dias, mas que estava ativa quando a proposalDate foi feita
      const campaignStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 dias atrás
      const campaignEnd = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000) // 25 dias atrás
      const campaign = await createSpecificCampaign(
        'Campanha 30 Dias',
        campaignStart,
        campaignEnd
      )

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data.id).toBe(campaign.id.toString())
    })

    it('should return 404 when proposalDate campaign is exactly at 31-day boundary', async () => {
      const now = new Date()
      const proposalDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)

      // Campanha que terminou há 31 dias (fora dos 30 dias)
      const campaignStart = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000)
      const campaignEnd = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)
      await createSpecificCampaign(
        'Campanha Muito Antiga',
        campaignStart,
        campaignEnd
      )

      // Criar campanha padrão ativa (não será considerada pois proposalDate é obrigatório)
      const currentStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      await createDefaultCampaign(
        'Campanha Padrão',
        currentStart,
        currentEnd
      )

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDate.toISOString().split('T')[0]}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      // Deve retornar 404 pois a específica está fora dos 30 dias
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('No active campaign found')
    })
  })
})
