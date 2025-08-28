import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'
import { PrismaClient } from '@prisma/client'
import { env } from '../../src/config/env.js'
import { normalizeDateToCampaignTime } from '../../src/utils/index.js'

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

    it('should apply previous campaign discount if scheduling is within 30 days after campaign end, based on proposal date and plan', async () => {
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
      const campaign2 = await createSpecificCampaign(
        'Campanha 2',
        campaign2Start,
        campaign2End
      )

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
      const campaign2 = await createSpecificCampaign(
        'Campanha 2',
        campaign2Start,
        campaign2End
      )

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
  })

  describe('GET /api/campaigns/active - Same Date as StartDate Test', () => {
    it('should find campaign when proposalDate equals campaign startDate', async () => {
      // Criar uma campanha que começa hoje às 03:00 UTC
      const today = new Date()
      const campaignStart = normalizeDateToCampaignTime(today)
      
      const campaignEnd = new Date(today)
      campaignEnd.setDate(campaignEnd.getDate() + 30) // Termina em 30 dias
      const normalizedCampaignEnd = normalizeDateToCampaignTime(campaignEnd)

      console.log('Test - campaignStart:', campaignStart)
      console.log('Test - campaignEnd:', normalizedCampaignEnd)

      const campaign = await createSpecificCampaign(
        'Campanha Mesma Data Start',
        campaignStart,
        normalizedCampaignEnd
      )

      // Usar a mesma data do startDate como proposalDate
      const proposalDateString = campaignStart.toISOString().split('T')[0]
      
      console.log('Test - proposalDateString:', proposalDateString)
      console.log('Test - Created campaign:', {
        id: campaign.id,
        name: campaign.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDateString}`,
        headers: getAuthHeaders(),
      })

      console.log('Test - Response status:', response.statusCode)
      console.log('Test - Response body:', response.body)

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe(campaign.id.toString())
      expect(body.data.name).toBe('Campanha Mesma Data Start')
    })

    it('should find campaign when proposalDate and schedulingDate equal campaign startDate', async () => {
      // Criar uma campanha que começa hoje às 03:00 UTC
      const today = new Date()
      const campaignStart = normalizeDateToCampaignTime(today)
      
      const campaignEnd = new Date(today)
      campaignEnd.setDate(campaignEnd.getDate() + 30) // Termina em 30 dias
      const normalizedCampaignEnd = normalizeDateToCampaignTime(campaignEnd)

      const campaign = await createSpecificCampaign(
        'Campanha Mesma Data Start e Agendamento',
        campaignStart,
        normalizedCampaignEnd
      )

      // Usar a mesma data do startDate como proposalDate e schedulingDate
      const dateString = campaignStart.toISOString().split('T')[0]
      
      console.log('Test - dateString:', dateString)
      console.log('Test - campaign startDate:', campaign.startDate)

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${dateString}&schedulingDate=${dateString}`,
        headers: getAuthHeaders(),
      })

      console.log('Test - Response status:', response.statusCode)
      console.log('Test - Response body:', response.body)

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe(campaign.id.toString())
      expect(body.data.name).toBe('Campanha Mesma Data Start e Agendamento')
    })

    it('should find campaign when proposalDate is today and campaign starts today at 03:00 UTC', async () => {
      // Criar uma campanha que começa hoje às 03:00 UTC
      const today = new Date()
      const campaignStart = normalizeDateToCampaignTime(today)
      
      const campaignEnd = new Date(today)
      campaignEnd.setDate(campaignEnd.getDate() + 7) // Termina em 7 dias
      const normalizedCampaignEnd = normalizeDateToCampaignTime(campaignEnd)

      const campaign = await createSpecificCampaign(
        'Campanha Hoje 03:00 UTC',
        campaignStart,
        normalizedCampaignEnd
      )

      // Usar a data de hoje como proposalDate (sem horário)
      const todayString = today.toISOString().split('T')[0]
      
      console.log('Test - todayString:', todayString)
      console.log('Test - campaign startDate:', campaign.startDate)
      console.log('Test - campaign endDate:', campaign.endDate)

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${todayString}`,
        headers: getAuthHeaders(),
      })

      console.log('Test - Response status:', response.statusCode)
      console.log('Test - Response body:', response.body)

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe(campaign.id.toString())
      expect(body.data.name).toBe('Campanha Hoje 03:00 UTC')
    })
  })

  describe('GET /api/campaigns/active - 30 Days Rule Test', () => {
    it('should return current specific campaign when schedulingDate is more than 30 days after proposal campaign end', async () => {
      const today = new Date()
      
      // Criar uma campanha antiga que terminou há mais de 30 dias
      const oldCampaignStart = new Date(today)
      oldCampaignStart.setDate(oldCampaignStart.getDate() - 60) // 60 dias atrás
      const normalizedOldStart = normalizeDateToCampaignTime(oldCampaignStart)
      
      const oldCampaignEnd = new Date(today)
      oldCampaignEnd.setDate(oldCampaignEnd.getDate() - 35) // Terminou há 35 dias


      // Criar uma campanha específica atual
      const currentCampaignStart = new Date(today)
      currentCampaignStart.setDate(currentCampaignStart.getDate() - 5) // Começou há 5 dias
      const normalizedCurrentStart = normalizeDateToCampaignTime(currentCampaignStart)
      
      const currentCampaignEnd = new Date(today)
      currentCampaignEnd.setDate(currentCampaignEnd.getDate() + 25) // Termina em 25 dias
      const normalizedCurrentEnd = normalizeDateToCampaignTime(currentCampaignEnd)

      const currentCampaign = await createSpecificCampaign(
        'Campanha Atual Específica',
        normalizedCurrentStart,
        normalizedCurrentEnd
      )

      // proposalDate = data da campanha antiga
      const proposalDateString = normalizedOldStart.toISOString().split('T')[0]
      
      // schedulingDate = hoje (mais de 30 dias após o fim da campanha antiga)
      const schedulingDateString = today.toISOString().split('T')[0]

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDateString}&schedulingDate=${schedulingDateString}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      // Deve retornar a campanha atual específica, não a antiga
      expect(body.data.id).toBe(currentCampaign.id.toString())
      expect(body.data.name).toBe('Campanha Atual Específica')
    })

    it('should return default campaign when no specific campaign is active and schedulingDate is more than 30 days after proposal campaign end', async () => {
      const today = new Date()
      
      // Criar uma campanha antiga que terminou há mais de 30 dias
      const oldCampaignStart = new Date(today)
      oldCampaignStart.setDate(oldCampaignStart.getDate() - 60) // 60 dias atrás
      const normalizedOldStart = normalizeDateToCampaignTime(oldCampaignStart)
      
      const oldCampaignEnd = new Date(today)
      oldCampaignEnd.setDate(oldCampaignEnd.getDate() - 35) // Terminou há 35 dias

      // Criar uma campanha padrão atual (não há campanha específica ativa)
      const defaultCampaignStart = new Date(today)
      defaultCampaignStart.setDate(defaultCampaignStart.getDate() - 10) // Começou há 10 dias
      const normalizedDefaultStart = normalizeDateToCampaignTime(defaultCampaignStart)
      
      const defaultCampaignEnd = new Date(today)
      defaultCampaignEnd.setDate(defaultCampaignEnd.getDate() + 20) // Termina em 20 dias
      const normalizedDefaultEnd = normalizeDateToCampaignTime(defaultCampaignEnd)

      const defaultCampaign = await createDefaultCampaign(
        'Campanha Padrão Atual',
        normalizedDefaultStart,
        normalizedDefaultEnd
      )

      // proposalDate = data da campanha antiga
      const proposalDateString = normalizedOldStart.toISOString().split('T')[0]
      
      // schedulingDate = hoje (mais de 30 dias após o fim da campanha antiga)
      const schedulingDateString = today.toISOString().split('T')[0]

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDateString}&schedulingDate=${schedulingDateString}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      // Deve retornar a campanha padrão atual
      expect(body.data.id).toBe(defaultCampaign.id.toString())
      expect(body.data.name).toBe('Campanha Padrão Atual')
    })

    it('should return proposal campaign when schedulingDate is within 30 days after proposal campaign end', async () => {
      const today = new Date()
      
      // Criar uma campanha que terminou há 15 dias (dentro dos 30 dias)
      const campaignStart = new Date(today)
      campaignStart.setDate(campaignStart.getDate() - 45) // 45 dias atrás
      const normalizedStart = normalizeDateToCampaignTime(campaignStart)
      
      const campaignEnd = new Date(today)
      campaignEnd.setDate(campaignEnd.getDate() - 15) // Terminou há 15 dias
      const normalizedEnd = normalizeDateToCampaignTime(campaignEnd)

      const proposalCampaign = await createSpecificCampaign(
        'Campanha da Proposta',
        normalizedStart,
        normalizedEnd
      )

      // Criar uma campanha atual (que não deve ser retornada)
      const currentCampaignStart = new Date(today)
      currentCampaignStart.setDate(currentCampaignStart.getDate() - 5) // Começou há 5 dias
      const normalizedCurrentStart = normalizeDateToCampaignTime(currentCampaignStart)
      
      const currentCampaignEnd = new Date(today)
      currentCampaignEnd.setDate(currentCampaignEnd.getDate() + 25) // Termina em 25 dias
      const normalizedCurrentEnd = normalizeDateToCampaignTime(currentCampaignEnd)

      await createSpecificCampaign(
        'Campanha Atual',
        normalizedCurrentStart,
        normalizedCurrentEnd
      )

      // proposalDate = data da campanha da proposta
      const proposalDateString = normalizedStart.toISOString().split('T')[0]
      
      // schedulingDate = hoje (15 dias após o fim da campanha da proposta - dentro dos 30 dias)
      const schedulingDateString = today.toISOString().split('T')[0]

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDateString}&schedulingDate=${schedulingDateString}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      // Deve retornar a campanha da proposta, não a atual
      expect(body.data.id).toBe(proposalCampaign.id.toString())
      expect(body.data.name).toBe('Campanha da Proposta')
    })

    it('should return current campaign when no proposal campaign is found', async () => {
      const today = new Date()
      
      // Criar uma campanha específica atual
      const currentCampaignStart = new Date(today)
      currentCampaignStart.setDate(currentCampaignStart.getDate() - 5) // Começou há 5 dias
      const normalizedCurrentStart = normalizeDateToCampaignTime(currentCampaignStart)
      
      const currentCampaignEnd = new Date(today)
      currentCampaignEnd.setDate(currentCampaignEnd.getDate() + 25) // Termina em 25 dias
      const normalizedCurrentEnd = normalizeDateToCampaignTime(currentCampaignEnd)

      const currentCampaign = await createSpecificCampaign(
        'Campanha Atual',
        normalizedCurrentStart,
        normalizedCurrentEnd
      )

      // proposalDate = data antiga onde não há campanha
      const oldDate = new Date(today)
      oldDate.setDate(oldDate.getDate() - 100) // 100 dias atrás
      const proposalDateString = oldDate.toISOString().split('T')[0]

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/active?proposalDate=${proposalDateString}`,
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      // Deve retornar a campanha atual
      expect(body.data.id).toBe(currentCampaign.id.toString())
      expect(body.data.name).toBe('Campanha Atual')
    })
  })
})
