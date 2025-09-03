import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'
import { PrismaClient } from '@prisma/client'
import { env } from '../../src/config/env.js'

describe('POST /api/campaigns/active - Success Cases with Plans Filter', () => {
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
  })

  beforeEach(async () => {
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()
  })

  afterAll(async () => {
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()
    await prisma.$disconnect()
    await app.close()
  })

  it('should return multiple campaigns when plans are distributed across different campaigns', async () => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Criar campanha específica com planos [1, 3]
    const specificCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Específica',
        startDate,
        endDate,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: specificCampaign.id,
        minLives: 1,
        maxLives: 5,
        plans: [1, 3],
        value: 10,
        paymentMethod: ['PIX'],
        accommodation: ['APARTMENT'],
        typeProduct: ['withParticipation'],
        obstetrics: ['withObstetric'],
      },
    })

    // Criar campanha padrão com planos [2, 4]
    const defaultCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Padrão',
        startDate,
        endDate,
        isDefault: true,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: defaultCampaign.id,
        minLives: 1,
        maxLives: 10,
        plans: [2, 4],
        value: 15,
        paymentMethod: ['CREDITCARD'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    // Testar com múltiplos planos [1, 2] - deve retornar ambas as campanhas
    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        plans: [1, 2], // Múltiplos planos
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)

    // Verificar se retornou a campanha específica
    const specificResult = body.data.find((c: any) => c.isDefault === false)
    expect(specificResult).toBeDefined()
    expect(specificResult.name).toBe('Campanha Específica')
    expect(specificResult.rules[0].plans).toContain(1)
    expect(specificResult.rules[0].value).toBe(10)

    // Verificar se retornou a campanha padrão
    const defaultResult = body.data.find((c: any) => c.isDefault === true)
    expect(defaultResult).toBeDefined()
    expect(defaultResult.name).toBe('Campanha Padrão')
    expect(defaultResult.rules[0].plans).toContain(2)
    expect(defaultResult.rules[0].value).toBe(15)
  })

  it('should return single campaign when all plans are in the same campaign', async () => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Criar campanha específica com planos [1, 2, 3]
    const specificCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Específica Completa',
        startDate,
        endDate,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: specificCampaign.id,
        minLives: 1,
        maxLives: 5,
        plans: [1, 2, 3],
        value: 20,
        paymentMethod: ['PIX', 'CREDITCARD'],
        accommodation: ['APARTMENT'],
        typeProduct: ['withParticipation'],
        obstetrics: ['withObstetric'],
      },
    })

    // Criar campanha padrão com outros planos [4, 5]
    const defaultCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Padrão',
        startDate,
        endDate,
        isDefault: true,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: defaultCampaign.id, // FIX: usar defaultCampaign.id
        minLives: 1,
        maxLives: 10,
        plans: [4, 5],
        value: 10,
        paymentMethod: ['CREDITCARD'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    // Testar com múltiplos planos [1, 2] - deve retornar apenas a campanha específica
    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        plans: [1, 2], // Múltiplos planos na mesma campanha
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Campanha Específica Completa')
    expect(body.data[0].isDefault).toBe(false)
    expect(body.data[0].rules[0].plans).toEqual([1, 2, 3])
    expect(body.data[0].rules[0].value).toBe(20)
  })

  it('should return only specific campaign when single plan is provided', async () => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Criar campanha específica
    const specificCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Específica',
        startDate,
        endDate,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: specificCampaign.id,
        minLives: 1,
        maxLives: 5,
        plans: [1, 3],
        value: 10,
        paymentMethod: ['PIX'],
        accommodation: ['APARTMENT'],
        typeProduct: ['withParticipation'],
        obstetrics: ['withObstetric'],
      },
    })

    // Criar campanha padrão
    const defaultCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Padrão',
        startDate,
        endDate,
        isDefault: true,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: defaultCampaign.id,
        minLives: 1,
        maxLives: 10,
        plans: [2, 4],
        value: 15,
        paymentMethod: ['CREDITCARD'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    // Testar com um único plano - deve retornar apenas a campanha específica (prioridade)
    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        plans: [1], // Apenas 1 plano
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)

    // Deve retornar apenas a campanha específica (prioridade)
    expect(body.data[0].id).toBe(specificCampaign.id.toString())
    expect(body.data[0].name).toBe('Campanha Específica')
    expect(body.data[0].isDefault).toBe(false)
  })

  it('should return default campaign when no specific campaign is active (3rd priority)', async () => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 dias atrás
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias no futuro

    // Criar apenas campanha padrão ativa (sem campanha específica)
    const defaultCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Padrão Única',
        startDate,
        endDate,
        isDefault: true,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: defaultCampaign.id,
        minLives: 1,
        maxLives: 10,
        plans: [1, 2, 3],
        value: 12,
        paymentMethod: ['PIX', 'CREDITCARD'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    // Testar com um plano - deve retornar a campanha padrão (3ª prioridade)
    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        plans: [1], // Um plano
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)

    // Verificar que retornou a campanha padrão
    expect(body.data[0].id).toBe(defaultCampaign.id.toString())
    expect(body.data[0].name).toBe('Campanha Padrão Única')
    expect(body.data[0].isDefault).toBe(true)
    expect(body.data[0].rules).toHaveLength(1)
    expect(body.data[0].rules[0].plans).toEqual([1, 2, 3])
    expect(body.data[0].rules[0].value).toBe(12)
  })

  it('should return 400 when plans array is empty', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        plans: [], // Array vazio deve dar erro
      },
    })

    expect(response.statusCode).toBe(400)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Validation Error')
  })

  it('should return 400 when plans is not provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {}, // Sem plans deve dar erro
    })

    expect(response.statusCode).toBe(400)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Validation Error')
  })

  it('should return specific campaign by proposalDate within 30 days (1st priority)', async () => {
    const now = new Date()
    const proposalDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 dias atrás

    // Campanha específica que estava ativa na proposalDate (mas já expirou, dentro dos 30 dias)
    const expiredStart = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 dias atrás
    const expiredEnd = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 dias atrás
    const expiredCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Específica Expirada',
        startDate: expiredStart,
        endDate: expiredEnd,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: expiredCampaign.id,
        minLives: 5,
        maxLives: 20,
        plans: [1, 2, 3],
        value: 25,
        paymentMethod: ['PIX', 'CREDITCARD'],
        accommodation: ['APARTMENT'],
        typeProduct: ['withParticipation'],
        obstetrics: ['withObstetric'],
      },
    })

    // Campanha específica ativa atualmente (deve ser ignorada devido à 1ª prioridade)
    const currentStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const currentCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Específica Atual',
        startDate: currentStart,
        endDate: currentEnd,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: currentCampaign.id,
        minLives: 1,
        maxLives: 10,
        plans: [1, 2],
        value: 15,
        paymentMethod: ['PIX'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    // Testar com proposalDate - deve retornar a campanha que estava ativa na proposalDate (1ª prioridade)
    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        proposalDate: proposalDate.toISOString().split('T')[0], // YYYY-MM-DD
        plans: [1], // Um plano
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)

    // Verificar que retornou a campanha que estava ativa na proposalDate (1ª prioridade)
    expect(body.data[0].id).toBe(expiredCampaign.id.toString())
    expect(body.data[0].name).toBe('Campanha Específica Expirada')
    expect(body.data[0].isDefault).toBe(false)
    expect(body.data[0].rules).toHaveLength(1)
    expect(body.data[0].rules[0].plans).toEqual([1, 2, 3])
    expect(body.data[0].rules[0].value).toBe(25)
  })

  it('should prioritize proposalDate over current specific campaign', async () => {
    const now = new Date()
    const proposalDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 dias atrás

    // Campanha específica que estava ativa na proposalDate (já expirou, mas dentro dos 30 dias)
    const proposalStart = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 dias atrás
    const proposalEnd = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 dias atrás
    const proposalCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha da Proposal',
        startDate: proposalStart,
        endDate: proposalEnd,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: proposalCampaign.id,
        minLives: 3,
        maxLives: 8,
        plans: [1, 2],
        value: 20,
        paymentMethod: ['PIX'],
        accommodation: ['APARTMENT'],
        typeProduct: ['withParticipation'],
        obstetrics: ['withObstetric'],
      },
    })

    // Campanha específica ativa atualmente (deve ser ignorada devido à prioridade da proposalDate)
    const currentStart = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 dias atrás
    const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias no futuro
    const currentCampaign = await prisma.campaign.create({
      data: {
        name: 'Campanha Atual',
        startDate: currentStart,
        endDate: currentEnd,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: currentCampaign.id,
        minLives: 1,
        maxLives: 10,
        plans: [1, 3],
        value: 15,
        paymentMethod: ['CREDITCARD'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    // Testar com proposalDate - deve retornar a campanha da proposalDate, não a atual
    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        proposalDate: proposalDate.toISOString().split('T')[0], // YYYY-MM-DD
        plans: [1], // Um plano presente em ambas
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)

    // Deve retornar a campanha da proposalDate, não a campanha atual
    expect(body.data[0].id).toBe(proposalCampaign.id.toString())
    expect(body.data[0].name).toBe('Campanha da Proposal')
    expect(body.data[0].isDefault).toBe(false)
    expect(body.data[0].rules).toHaveLength(1)
    expect(body.data[0].rules[0].plans).toEqual([1, 2])
    expect(body.data[0].rules[0].value).toBe(20)

    // Verificar que NÃO retornou a campanha atual
    expect(body.data[0].name).not.toBe('Campanha Atual')
    expect(body.data[0].rules[0].value).not.toBe(15)
  })

  it('should return proper campaign structure with all fields and rules', async () => {
    const now = new Date()
    const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Criar campanha específica com múltiplas rules
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign Structure',
        startDate,
        endDate,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    // Criar primeira rule
    await prisma.rule.create({
      data: {
        campaignId: campaign.id,
        minLives: 1,
        maxLives: 5,
        plans: [1, 2],
        value: 10,
        paymentMethod: ['PIX', 'CREDITCARD'],
        accommodation: ['APARTMENT'],
        typeProduct: ['withParticipation'],
        obstetrics: ['withObstetric'],
      },
    })

    // Criar segunda rule
    await prisma.rule.create({
      data: {
        campaignId: campaign.id,
        minLives: 6,
        maxLives: 10,
        plans: [3, 4],
        value: 15,
        paymentMethod: ['PIX'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        plans: [1], // Um plano para testar estrutura
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)

    const campaignData = body.data[0]

    // Verificar estrutura completa da campanha
    expect(campaignData).toMatchObject({
      id: expect.any(String),
      name: 'Test Campaign Structure',
      startDate: expect.any(String),
      endDate: expect.any(String),
      isDefault: false,
      status: 'ACTIVE',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      rules: expect.any(Array),
    })

    // Verificar que tem 2 rules
    expect(campaignData.rules).toHaveLength(2)

    // Verificar estrutura completa das rules
    campaignData.rules.forEach((rule: any) => {
      expect(rule).toMatchObject({
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
      })

      // Verificar tipos específicos dos arrays
      expect(Array.isArray(rule.plans)).toBe(true)
      expect(Array.isArray(rule.paymentMethod)).toBe(true)
      expect(Array.isArray(rule.accommodation)).toBe(true)
      expect(Array.isArray(rule.typeProduct)).toBe(true)
      expect(Array.isArray(rule.obstetrics)).toBe(true)

      // Verificar que plans contém números
      rule.plans.forEach((plan: any) => {
        expect(typeof plan).toBe('number')
      })

      // Verificar que outros arrays contêm strings
      rule.paymentMethod.forEach((method: any) => {
        expect(typeof method).toBe('string')
      })
    })

    // Verificar dados específicos da primeira rule
    const firstRule = campaignData.rules.find((r: any) => r.plans.includes(1))
    expect(firstRule).toBeDefined()
    expect(firstRule.minLives).toBe(1)
    expect(firstRule.maxLives).toBe(5)
    expect(firstRule.plans).toEqual([1, 2])
    expect(firstRule.value).toBe(10)
    expect(firstRule.paymentMethod).toEqual(['PIX', 'CREDITCARD'])
    expect(firstRule.accommodation).toEqual(['APARTMENT'])
    expect(firstRule.typeProduct).toEqual(['withParticipation'])
    expect(firstRule.obstetrics).toEqual(['withObstetric'])

    // Verificar dados específicos da segunda rule
    const secondRule = campaignData.rules.find((r: any) => r.plans.includes(3))
    expect(secondRule).toBeDefined()
    expect(secondRule.minLives).toBe(6)
    expect(secondRule.maxLives).toBe(10)
    expect(secondRule.plans).toEqual([3, 4])
    expect(secondRule.value).toBe(15)
    expect(secondRule.paymentMethod).toEqual(['PIX'])
    expect(secondRule.accommodation).toEqual(['INFIRMARY'])
    expect(secondRule.typeProduct).toEqual(['withoutParticipation'])
    expect(secondRule.obstetrics).toEqual(['withoutObstetric'])

    // Verificar formato das datas
    expect(new Date(campaignData.startDate).toISOString()).toBe(startDate.toISOString())
    expect(new Date(campaignData.endDate).toISOString()).toBe(endDate.toISOString())
    expect(Date.parse(campaignData.createdAt)).not.toBeNaN()
    expect(Date.parse(campaignData.updatedAt)).not.toBeNaN()
  })

  it('should apply previous campaign discount if scheduling is within 30 days after campaign end, based on proposal date and plan', async () => {
    // Criar campanhas com datas específicas para testar a regra dos 30 dias
    const campaign1Start = new Date('2025-01-01T00:00:00Z')
    const campaign1End = new Date('2025-09-30T23:59:59Z')
    const campaign1 = await prisma.campaign.create({
      data: {
        name: 'Campanha 1',
        startDate: campaign1Start,
        endDate: campaign1End,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: campaign1.id,
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

    // Criar segunda campanha que começa após a primeira
    const campaign2Start = new Date('2025-10-01T00:00:00Z')
    const campaign2End = new Date('2025-12-31T23:59:59Z')
    const campaign2 = await prisma.campaign.create({
      data: {
        name: 'Campanha 2',
        startDate: campaign2Start,
        endDate: campaign2End,
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    await prisma.rule.create({
      data: {
        campaignId: campaign2.id,
        minLives: 1,
        maxLives: 10,
        plans: [1, 2],
        value: 20,
        paymentMethod: ['PIX'],
        accommodation: ['INFIRMARY'],
        typeProduct: ['withoutParticipation'],
        obstetrics: ['withoutObstetric'],
      },
    })

    // proposalDate: durante a Campanha 1 (2025-07-08)
    // schedulingDate: até 30 dias após fim da Campanha 1 (2025-10-15 = 15 dias após 30/09)
    const proposalDate = new Date('2025-07-08T00:00:00Z')
    const schedulingDate = new Date('2025-10-15T00:00:00Z') // 15 dias após fim da Campanha 1

    const response = await app.inject({
      method: 'POST',
      url: '/api/campaigns/active',
      headers: getAuthHeaders(),
      payload: {
        proposalDate: proposalDate.toISOString().split('T')[0], // 2025-07-08
        schedulingDate: schedulingDate.toISOString().split('T')[0], // 2025-10-15
        plans: [1], // Plano presente em ambas campanhas
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)

    // Deve retornar a Campanha 1 (campanha da proposalDate) porque:
    // - proposalDate estava na Campanha 1
    // - schedulingDate está dentro de 30 dias após o fim da Campanha 1
    expect(body.data[0].id).toBe(campaign1.id.toString())
    expect(body.data[0].name).toBe('Campanha 1')
    expect(body.data[0].isDefault).toBe(false)
    expect(body.data[0].rules).toHaveLength(1)
    expect(body.data[0].rules[0].plans).toContain(1)
    expect(body.data[0].rules[0].value).toBe(15)

    // Verificar que NÃO retornou a Campanha 2 (mesmo estando ativa no schedulingDate)
    expect(body.data[0].name).not.toBe('Campanha 2')
    expect(body.data[0].rules[0].value).not.toBe(20)
  })
})
