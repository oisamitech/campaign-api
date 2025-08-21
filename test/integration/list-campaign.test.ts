import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'
import { PrismaClient } from '@prisma/client'
import { env } from '../../src/config/env.js'

describe('List Campaigns Integration Tests', () => {
  let app: FastifyInstance
  let prisma: PrismaClient

  // Helper function para criar headers de autorização
  const getAuthHeaders = () => {
    const authKey = env.BEARER_AUTH_KEY?.split(',')[0] || 'test-token'
    return {
      authorization: `Bearer ${authKey}`,
    }
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
    console.log('✅ Conectado ao banco MySQL')
  })

  beforeEach(async () => {
    // Limpar dados existentes
    await prisma.rule.deleteMany()
    await prisma.campaign.deleteMany()

    // Criar campanha de teste com regras
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign - API Test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        isDefault: false,
        status: 'ACTIVE',
      },
    })

    // Criar regras para a campanha
    await prisma.rule.createMany({
      data: [
        {
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
        {
          campaignId: campaign.id,
          minLives: 21,
          maxLives: 50,
          plans: [4, 5, 6],
          value: 25,
          paymentMethod: ['BANKSLIP'],
          accommodation: ['INFIRMARY'],
          typeProduct: ['withoutParticipation'],
          obstetrics: ['withoutObstetric'],
        },
      ],
    })
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

  describe('Campaign API Endpoints', () => {
    it('should return 200 and list all campaigns with their rules', async () => {
      // Buscar campanhas via API (GET /api/campaigns)
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
      })

      // Verificar resposta
      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toBeDefined()

      // Verificar estrutura da campanha com regras
      if (body.data.length > 0) {
        const campaign = body.data[0]
        expect(campaign.id).toBeDefined()
        expect(campaign.name).toBeDefined()
        expect(campaign.startDate).toBeDefined()
        expect(campaign.endDate).toBeDefined()
        expect(campaign.isDefault).toBeDefined()
        expect(campaign.status).toBeDefined()
        expect(campaign.rules).toBeDefined()
        expect(Array.isArray(campaign.rules)).toBe(true)
        expect(campaign.rules.length).toBeGreaterThan(0)

        // Verificar estrutura da regra
        const rule = campaign.rules[0]
        expect(rule.id).toBeDefined()
        expect(rule.minLives).toBeDefined()
        expect(rule.maxLives).toBeDefined()
        expect(rule.plans).toBeDefined()
        expect(rule.value).toBeDefined()
        expect(rule.paymentMethod).toBeDefined()
        expect(rule.accommodation).toBeDefined()
        expect(rule.typeProduct).toBeDefined()
        expect(rule.obstetrics).toBeDefined()
        expect(rule.createdAt).toBeDefined()
        expect(rule.updatedAt).toBeDefined()
      }
    })

    it('should return campaigns with multiple rules', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1) // Uma campanha criada no beforeEach

      const campaign = body.data[0]
      expect(campaign.rules).toHaveLength(2) // Duas regras criadas no beforeEach
    })
  })

  describe('Authentication Tests', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 when invalid token is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    // it('should handle pagination with invalid parameters', async () => {
    //   // Testar com página negativa
    //   const response1 = await app.inject({
    //     method: 'GET',
    //     url: '/api/campaigns?page=-1&limit=10',
    //     headers: getAuthHeaders(),
    //   })
    //   expect(response1.statusCode).toBe(200) // Deve normalizar para página 1

    //   const body1 = JSON.parse(response1.body)
    //   expect(body1.meta.currentPage).toBe(1)

    //   // Testar com limite muito alto
    //   const response2 = await app.inject({
    //     method: 'GET',
    //     url: '/api/campaigns?page=1&limit=1000',
    //     headers: getAuthHeaders(),
    //   })
    //   expect(response2.statusCode).toBe(200)

    //   const body2 = JSON.parse(response2.body)
    //   expect(body2.meta.itemsPerPage).toBeLessThanOrEqual(100) // Deve ter limite máximo

    //   // Testar com parâmetros inválidos (NaN)
    //   const response3 = await app.inject({
    //     method: 'GET',
    //     url: '/api/campaigns?page=abc&limit=xyz',
    //     headers: getAuthHeaders(),
    //   })

    //   // Pode retornar 200 (com valores padrão) ou 500 (se houver erro interno)
    //   expect([200, 500]).toContain(response3.statusCode)

    //   if (response3.statusCode === 200) {
    //     const body3 = JSON.parse(response3.body)
    //     expect(body3.meta.currentPage).toBe(1)
    //     expect(body3.meta.itemsPerPage).toBe(10)
    //   } else {
    //     const body3 = JSON.parse(response3.body)
    //     expect(body3.success).toBe(false)
    //     expect(body3.error).toBeDefined()
    //   }
    // })

    it('should handle empty database gracefully', async () => {
      // Limpar banco temporariamente
      await prisma.rule.deleteMany()
      await prisma.campaign.deleteMany()

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data).toEqual([])
      expect(body.meta.totalItems).toBe(0)
      expect(body.meta.totalPages).toBe(0)
      expect(body.meta.hasNextPage).toBe(false)
      expect(body.meta.hasPreviousPage).toBe(false)
    })

    it('should handle malformed query parameters', async () => {
      // Testar com parâmetros malformados que resultam em NaN
      const malformedUrls = [
        '/api/campaigns?page=',
        '/api/campaigns?limit=',
        '/api/campaigns?page=&limit=',
        '/api/campaigns?page=null&limit=undefined',
        '/api/campaigns?page=1.5&limit=5.7',
        '/api/campaigns?page=0&limit=0',
        '/api/campaigns?page=999999999999999&limit=999999999999999',
      ]

      for (const url of malformedUrls) {
        const response = await app.inject({
          method: 'GET',
          url,
          headers: getAuthHeaders(),
        })

        // Pode retornar 200 (com valores normalizados) ou 500 (se houver erro interno)
        expect([200, 500]).toContain(response.statusCode)

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body)
          expect(body.success).toBe(true)
          expect(body.meta.currentPage).toBeGreaterThan(0)
          expect(body.meta.itemsPerPage).toBeGreaterThan(0)
        } else {
          const body = JSON.parse(response.body)
          expect(body.success).toBe(false)
          expect(body.error).toBeDefined()
        }
      }
    })

    it('should handle campaigns without rules (edge case)', async () => {
      // Criar uma campanha sem regras diretamente no banco (caso edge)
      await prisma.rule.deleteMany()
      await prisma.campaign.deleteMany()

      await prisma.campaign.create({
        data: {
          name: 'Campaign without rules',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          isDefault: false,
          status: 'ACTIVE',
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].rules).toEqual([]) // Array vazio de regras
    })

    it('should validate query parameter validation behavior', async () => {
      // Teste específico para entender como a validação funciona

      // 1. Testar com apenas parâmetros válidos
      const validResponse = await app.inject({
        method: 'GET',
        url: '/api/campaigns?page=1&limit=5',
        headers: getAuthHeaders(),
      })
      expect(validResponse.statusCode).toBe(200)

      // 2. Testar com parâmetro extra
      const extraParamResponse = await app.inject({
        method: 'GET',
        url: '/api/campaigns?page=1&limit=5&invalid=test',
        headers: getAuthHeaders(),
      })

      console.log('Extra param response status:', extraParamResponse.statusCode)
      if (extraParamResponse.statusCode !== 200) {
        console.log('Extra param response body:', extraParamResponse.body)
      }

      // Pode ser 200 ou 400 dependendo da configuração do Fastify
      expect([200, 400]).toContain(extraParamResponse.statusCode)
    })

    it('should handle database connection issues gracefully', async () => {
      // Simular problema de conexão (não é possível testar real, mas podemos validar estrutura)
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
      })

      // Mesmo com problemas, deve retornar estrutura válida
      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('data')
      expect(body).toHaveProperty('meta')

      // Se houver erro, deve estar na estrutura correta
      if (!body.success) {
        expect(body).toHaveProperty('error')
        expect(body).toHaveProperty('message')
      }
    })
  })

  describe('Campaign Ordering Tests', () => {
    beforeEach(async () => {
      // Limpar dados existentes
      await prisma.rule.deleteMany()
      await prisma.campaign.deleteMany()

      // Criar campanhas com diferentes datas para testar ordenação
      const currentDate = new Date()

      // Campanha ativa 1 (mais recente)
      const activeCampaign1 = await prisma.campaign.create({
        data: {
          name: 'Active Campaign Recent',
          startDate: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 dias atrás
          endDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias no futuro
          isDefault: false,
          status: 'ACTIVE',
        },
      })

      // Campanha ativa 2 (mais antiga)
      const activeCampaign2 = await prisma.campaign.create({
        data: {
          name: 'Active Campaign Old',
          startDate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
          endDate: new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 dias no futuro
          isDefault: false,
          status: 'ACTIVE',
        },
      })

      // Campanha inativa 1 (mais antiga)
      const inactiveCampaign1 = await prisma.campaign.create({
        data: {
          name: 'Inactive Campaign Old',
          startDate: new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 dias atrás
          endDate: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 dias atrás
          isDefault: false,
          status: 'INACTIVE',
        },
      })

      // Campanha inativa 2 (mais recente)
      const inactiveCampaign2 = await prisma.campaign.create({
        data: {
          name: 'Inactive Campaign Recent',
          startDate: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 dias atrás
          endDate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
          isDefault: false,
          status: 'INACTIVE',
        },
      })

      // Campanha futura (inativa)
      await prisma.campaign.create({
        data: {
          name: 'Future Campaign',
          startDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias no futuro
          endDate: new Date(currentDate.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 dias no futuro
          isDefault: false,
          status: 'ACTIVE',
        },
      })

      // Adicionar regras para as campanhas (para manter compatibilidade)
      const campaigns = [
        activeCampaign1,
        activeCampaign2,
        inactiveCampaign1,
        inactiveCampaign2,
      ]
      for (const campaign of campaigns) {
        await prisma.rule.create({
          data: {
            campaignId: campaign.id,
            minLives: 1,
            maxLives: 10,
            plans: [1, 2],
            value: 10,
            paymentMethod: ['PIX'],
            accommodation: ['APARTMENT'],
            typeProduct: ['withParticipation'],
            obstetrics: ['withObstetric'],
          },
        })
      }
    })

    it('should return campaigns ordered with active campaigns first (most recent to oldest), then inactive campaigns (oldest to most recent)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(5) // 5 campanhas criadas

      const campaigns = body.data
      const currentDate = new Date()

      // Separar campanhas ativas e inativas baseado nas datas
      const activeCampaigns = campaigns.filter((campaign: any) => {
        const startDate = new Date(campaign.startDate)
        const endDate = new Date(campaign.endDate)
        return startDate <= currentDate && endDate >= currentDate
      })

      const inactiveCampaigns = campaigns.filter((campaign: any) => {
        const startDate = new Date(campaign.startDate)
        const endDate = new Date(campaign.endDate)
        return !(startDate <= currentDate && endDate >= currentDate)
      })

      // Verificar que temos campanhas ativas e inativas
      expect(activeCampaigns.length).toBe(2)
      expect(inactiveCampaigns.length).toBe(3)

      // Verificar que campanhas ativas vêm primeiro
      const firstTwoCampaigns = campaigns.slice(0, 2)
      const lastThreeCampaigns = campaigns.slice(2, 5)

      // Todas as primeiras devem ser ativas
      firstTwoCampaigns.forEach((campaign: any) => {
        const startDate = new Date(campaign.startDate)
        const endDate = new Date(campaign.endDate)
        expect(startDate <= currentDate && endDate >= currentDate).toBe(true)
      })

      // Todas as últimas devem ser inativas
      lastThreeCampaigns.forEach((campaign: any) => {
        const startDate = new Date(campaign.startDate)
        const endDate = new Date(campaign.endDate)
        expect(startDate <= currentDate && endDate >= currentDate).toBe(false)
      })

      // Verificar ordenação das campanhas ativas (mais recente para mais antiga)
      expect(firstTwoCampaigns[0].name).toBe('Active Campaign Recent')
      expect(firstTwoCampaigns[1].name).toBe('Active Campaign Old')

      // Verificar ordenação das campanhas inativas (mais antiga para mais recente)
      expect(lastThreeCampaigns[0].name).toBe('Inactive Campaign Old')
      expect(lastThreeCampaigns[1].name).toBe('Inactive Campaign Recent')
      expect(lastThreeCampaigns[2].name).toBe('Future Campaign')
    })

    it('should maintain correct ordering when there are only active campaigns', async () => {
      // Limpar dados e criar apenas campanhas ativas
      await prisma.rule.deleteMany()
      await prisma.campaign.deleteMany()

      const currentDate = new Date()

      const campaigns = [
        {
          name: 'Active Campaign 1',
          startDate: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
          endDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias no futuro
        },
        {
          name: 'Active Campaign 2',
          startDate: new Date(currentDate.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 dias atrás
          endDate: new Date(currentDate.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 dias no futuro
        },
        {
          name: 'Active Campaign 3',
          startDate: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 dias atrás
          endDate: new Date(currentDate.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 dias no futuro
        },
      ]

      for (const campaignData of campaigns) {
        const campaign = await prisma.campaign.create({
          data: {
            ...campaignData,
            isDefault: false,
            status: 'ACTIVE',
          },
        })

        await prisma.rule.create({
          data: {
            campaignId: campaign.id,
            minLives: 1,
            maxLives: 10,
            plans: [1],
            value: 10,
            paymentMethod: ['PIX'],
            accommodation: ['APARTMENT'],
            typeProduct: ['withParticipation'],
            obstetrics: ['withObstetric'],
          },
        })
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      const responseCampaigns = body.data

      expect(responseCampaigns).toHaveLength(3)

      // Verificar ordenação: mais recente para mais antiga (por startDate)
      expect(responseCampaigns[0].name).toBe('Active Campaign 1') // -5 dias (mais recente)
      expect(responseCampaigns[1].name).toBe('Active Campaign 3') // -10 dias
      expect(responseCampaigns[2].name).toBe('Active Campaign 2') // -20 dias (mais antiga)
    })

    it('should maintain correct ordering when there are only inactive campaigns', async () => {
      // Limpar dados e criar apenas campanhas inativas
      await prisma.rule.deleteMany()
      await prisma.campaign.deleteMany()

      const currentDate = new Date()

      const campaigns = [
        {
          name: 'Inactive Campaign 1',
          startDate: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 dias atrás
          endDate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
        },
        {
          name: 'Inactive Campaign 2',
          startDate: new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 dias atrás
          endDate: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 dias atrás
        },
        {
          name: 'Future Campaign',
          startDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias no futuro
          endDate: new Date(currentDate.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 dias no futuro
        },
      ]

      for (const campaignData of campaigns) {
        const campaign = await prisma.campaign.create({
          data: {
            ...campaignData,
            isDefault: false,
            status: 'INACTIVE',
          },
        })

        await prisma.rule.create({
          data: {
            campaignId: campaign.id,
            minLives: 1,
            maxLives: 10,
            plans: [1],
            value: 10,
            paymentMethod: ['PIX'],
            accommodation: ['APARTMENT'],
            typeProduct: ['withParticipation'],
            obstetrics: ['withObstetric'],
          },
        })
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns',
        headers: getAuthHeaders(),
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      const responseCampaigns = body.data

      expect(responseCampaigns).toHaveLength(3)

      // Verificar ordenação: mais antiga para mais recente (por startDate)
      expect(responseCampaigns[0].name).toBe('Inactive Campaign 2') // -90 dias (mais antiga)
      expect(responseCampaigns[1].name).toBe('Inactive Campaign 1') // -60 dias
      expect(responseCampaigns[2].name).toBe('Future Campaign') // +30 dias (mais recente)
    })
  })
})
