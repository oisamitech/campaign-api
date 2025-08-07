import { config } from '../src/config';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Disable OpenTelemetry for tests
process.env.OTEL_ENABLED = 'false';

// Create test database if it doesn't exist
async function setupTestDatabase() {
  // Create a connection without specifying a database
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });

  try {
    // Create the test database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.db.database}`);
    console.log(`Test database '${config.db.database}' is ready`);
  } catch (error) {
    console.error('Failed to create test database:', error);
  } finally {
    await connection.end();
  }
}

// Setup the test database before tests run
setupTestDatabase();

// Mock console methods to reduce noise in test output
if (process.env.NODE_ENV === 'test') {
  // global.console = {
  //   ...console,
  //   log: jest.fn(),
  //   info: jest.fn(),
  //   debug: jest.fn(),
  // };
}
