import { trace } from '@opentelemetry/api';
import mysql from 'mysql2/promise';
import { config } from '../config';

// Create a tracer for database operations
const tracer = trace.getTracer('mysql-operations');

// Create a connection pool
const pool = mysql.createPool({
	host: config.db.host,
	port: config.db.port,
	user: config.db.user,
	password: config.db.password,
	database: config.db.database,
	waitForConnections: true,
	connectionLimit: config.db.poolMax,
	queueLimit: 0,
	enableKeepAlive: true,
	keepAliveInitialDelay: 0,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
	try {
		const connection = await pool.getConnection();
		connection.release();
		console.log('Database connection successful');
		return true;
	} catch (error) {
		console.error('Database connection failed:', error);
		return false;
	}
}

// Execute a query with tracing
export async function query<T>(sql: string, params?: any[]): Promise<T> {
	return tracer.startActiveSpan('db.query', async (span) => {
		try {
			span.setAttribute('db.statement', sql);
			if (params) {
				span.setAttribute('db.params', JSON.stringify(params));
			}

			const [rows] = await pool.execute(sql, params);
			return rows as T;
		} catch (error) {
			span.recordException(error as Error);
			throw error;
		} finally {
			span.end();
		}
	});
}

// Close all connections in the pool
export async function closePool(): Promise<void> {
	return pool.end();
}

export default {
	pool,
	query,
	testConnection,
	closePool,
};
