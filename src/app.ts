import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastify, { FastifyInstance } from 'fastify';
import { config } from './config';
import { registerRoutes } from './routes';

export async function buildApp(): Promise<FastifyInstance> {
	const app = fastify({
		logger: {
			level: config.app.logLevel,
			transport: {
				target: 'pino-pretty',
				options: {
					translateTime: 'HH:MM:ss Z',
					ignore: 'pid,hostname',
				},
			},
		},
	});

	// Register plugins
	await app.register(cors, {
		origin: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	});

	// Register Swagger
	await app.register(swagger, {
		openapi: {
			info: {
				title: 'API Template',
				description:
					'API Template with TypeScript, Fastify, MySQL and OpenTelemetry',
				version: '1.0.0',
			},
			servers: [
				{
					url: `http://${config.app.host}:${config.app.port}`,
					description: 'Development server',
				},
			],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT',
					},
				},
			},
		},
	});

	await app.register(swaggerUi, {
		routePrefix: '/documentation',
		uiConfig: {
			docExpansion: 'list',
			deepLinking: true,
		},
	});

	// Register routes
	await registerRoutes(app);

	// Error handler
	app.setErrorHandler((error, request, reply) => {
		request.log.error(error);

		// Handle validation errors
		if (error.validation) {
			return reply.status(400).send({
				error: 'Bad Request',
				message: error.message,
				details: error.validation,
			});
		}

		// Handle other errors
		const statusCode = error.statusCode || 500;
		const errorMessage = error.message || 'Internal Server Error';

		return reply.status(statusCode).send({
			error: statusCode >= 500 ? 'Internal Server Error' : errorMessage,
			message:
				statusCode >= 500 ? 'An unexpected error occurred' : errorMessage,
		});
	});

	return app;
}
