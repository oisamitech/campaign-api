import { FastifyInstance } from 'fastify';
import { userRoutes } from './user.routes';

export async function registerRoutes(fastify: FastifyInstance) {
	// Register all routes here
	fastify.register(userRoutes, { prefix: '/users' });

	// Health check endpoint
	fastify.get('/health', {
		schema: {
			tags: ['health'],
			summary: 'Health check endpoint',
			response: {
				200: {
					type: 'object',
					properties: {
						status: { type: 'string' },
						timestamp: { type: 'string', format: 'date-time' },
					},
				},
			},
		},
		handler: async () => {
			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
			};
		},
	});
}
