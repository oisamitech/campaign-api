import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import database, { query } from '../../database/connection';

describe('User Routes Integration Tests', () => {
  let app: FastifyInstance;
  let createdUserId: string;

  // Setup test app
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create test database tables if they don't exist
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  });

  // Clean up database before each test
  beforeEach(async () => {
    await query('DELETE FROM users');
  });

  // Close app and database connections after tests
  afterAll(async () => {
    await app.close();
    await database.pool.end();
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('User created successfully');
      expect(body.data).toHaveProperty('id');
      expect(body.data.name).toBe(userData.name);
      expect(body.data.email).toBe(userData.email);

      // Save the created user ID for later tests
      createdUserId = body.data.id;
    });

    it('should return 409 when trying to create a user with an existing email', async () => {
      // First create a user
      const userData = {
        name: 'Existing User',
        email: 'existing@example.com',
      };

      await app.inject({
        method: 'POST',
        url: '/users',
        payload: userData,
      });

      // Try to create another user with the same email
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userData,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Conflict');
      expect(body.message).toContain('already in use');
    });

    it('should return 400 when validation fails', async () => {
      const invalidData = {
        name: 'T', // Too short
        email: 'invalid-email', // Invalid email format
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
    });
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      // Create some test users first
      const testUsers = [
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
      ];

      for (const user of testUsers) {
        await app.inject({
          method: 'POST',
          url: '/users',
          payload: user,
        });
      }

      // Get all users
      const response = await app.inject({
        method: 'GET',
        url: '/users',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.data[0]).toHaveProperty('id');
      expect(body.data[0]).toHaveProperty('name');
      expect(body.data[0]).toHaveProperty('email');
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by ID', async () => {
      // Create a test user first
      const userData = {
        name: 'Get User Test',
        email: 'getuser@example.com',
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userData,
      });

      const { data: createdUser } = JSON.parse(createResponse.body);

      // Get the user by ID
      const response = await app.inject({
        method: 'GET',
        url: `/users/${createdUser.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('id', createdUser.id);
      expect(body.data).toHaveProperty('name', userData.name);
      expect(body.data).toHaveProperty('email', userData.email);
    });

    it('should return 404 for non-existent user', async () => {
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentId = '00000000-0000-4000-a000-000000000000';
      
      const response = await app.inject({
        method: 'GET',
        url: `/users/${nonExistentId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update an existing user', async () => {
      // Create a test user first
      const userData = {
        name: 'Update User Test',
        email: 'updateuser@example.com',
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userData,
      });

      const { data: createdUser } = JSON.parse(createResponse.body);

      // Update the user
      const updateData = {
        name: 'Updated Name',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${createdUser.id}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('User updated successfully');
      expect(body.data).toHaveProperty('id', createdUser.id);
      expect(body.data).toHaveProperty('name', updateData.name);
      expect(body.data).toHaveProperty('email', userData.email);
    });

    it('should return 404 for non-existent user', async () => {
      const updateData = {
        name: 'Updated Name',
      };
      
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentId = '00000000-0000-4000-a000-000000000000';

      const response = await app.inject({
        method: 'PUT',
        url: `/users/${nonExistentId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete an existing user', async () => {
      // Create a test user first
      const userData = {
        name: 'Delete User Test',
        email: 'deleteuser@example.com',
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userData,
      });

      const { data: createdUser } = JSON.parse(createResponse.body);

      // Delete the user
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${createdUser.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('User deleted successfully');

      // Verify the user is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/users/${createdUser.id}`,
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent user', async () => {
      // Use a valid UUID format that doesn't exist in the database
      const nonExistentId = '00000000-0000-4000-a000-000000000000';
      
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${nonExistentId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });
  });
});
