import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define configuration schema with validation
const configSchema = z.object({
	app: z.object({
		nodeEnv: z
			.enum(['development', 'test', 'production'])
			.default('development'),
		port: z.coerce.number().default(3000),
		host: z.string().default('0.0.0.0'),
		logLevel: z
			.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
			.default('info'),
	}),
	db: z.object({
		host: z.string().default('localhost'),
		port: z.coerce.number().default(3306),
		user: z.string().default('root'),
		password: z.string().default('password'),
		database: z.string().default('api_template'),
		poolMin: z.coerce.number().default(1),
		poolMax: z.coerce.number().default(10),
	}),
	telemetry: z.object({
		enabled: z.coerce.boolean().default(true),
		serviceName: z.string().default('api-template'),
		otlpEndpoint: z.string().default('http://localhost:4318'),
		prometheusPort: z.coerce.number().default(9464),
	}),
});

// Parse and validate configuration
export const config = configSchema.parse({
	app: {
		nodeEnv: process.env.NODE_ENV,
		port: process.env.PORT,
		host: process.env.HOST,
		logLevel: process.env.LOG_LEVEL,
	},
	db: {
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		poolMin: process.env.DB_POOL_MIN,
		poolMax: process.env.DB_POOL_MAX,
	},
	telemetry: {
		enabled: process.env.OTEL_ENABLED,
		serviceName: process.env.OTEL_SERVICE_NAME,
		otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
		prometheusPort: process.env.OTEL_EXPORTER_PROMETHEUS_PORT,
	},
});

export type Config = z.infer<typeof configSchema>;
