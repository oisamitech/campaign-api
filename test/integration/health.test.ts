import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { createApp } from '../../src/app.js'

describe('Health Routes Integration Tests', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createApp()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/health', () => {
    it('should return 200 and health status information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
        version: expect.any(String),
        database: {
          status: expect.stringMatching(/^(online|offline)$/),
          provider: 'mysql',
        },
      })

      // Validate timestamp format
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)

      // Validate uptime is a positive number
      expect(body.uptime).toBeGreaterThan(0)

      // Validate environment
      expect(['development', 'test', 'production']).toContain(body.environment)

      // Validate database response time format (should be "Xms" or null)
      if (body.database.responseTime) {
        expect(body.database.responseTime).toMatch(/^\d+ms$/)
      }
    })
  })

  describe('Concurrent requests', () => {
    it('should handle multiple concurrent health requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/health',
        })
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.status).toBe('ok')
        expect(body.database).toBeDefined()
        expect(body.database.provider).toBe('mysql')
      })
    })
  })
})
