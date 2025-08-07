import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller';

export async function userRoutes(fastify: FastifyInstance) {
	const userController = new UserController();

	// Get all users
	fastify.get('/', {
		schema: {
			tags: ['users'],
			summary: 'Get all users',
			response: {
				200: {
					type: 'object',
					properties: {
						data: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									id: { type: 'string' },
									name: { type: 'string' },
									email: { type: 'string' },
									created_at: { type: 'string', format: 'date-time' },
									updated_at: { type: 'string', format: 'date-time' },
								},
							},
						},
					},
				},
				500: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
			},
		},
		handler: userController.getAllUsers.bind(userController),
	});

	// Get user by ID
	fastify.get('/:id', {
		schema: {
			tags: ['users'],
			summary: 'Get user by ID',
			params: {
				type: 'object',
				required: ['id'],
				properties: {
					id: { type: 'string', format: 'uuid' },
				},
			},
			response: {
				200: {
					type: 'object',
					properties: {
						data: {
							type: 'object',
							properties: {
								id: { type: 'string' },
								name: { type: 'string' },
								email: { type: 'string' },
								created_at: { type: 'string', format: 'date-time' },
								updated_at: { type: 'string', format: 'date-time' },
							},
						},
					},
				},
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
				500: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
			},
		},
		handler: userController.getUserById.bind(userController),
	});

	// Create a new user
	fastify.post('/', {
		schema: {
			tags: ['users'],
			summary: 'Create a new user',
			body: {
				type: 'object',
				required: ['name', 'email'],
				properties: {
					name: { type: 'string', minLength: 2, maxLength: 255 },
					email: { type: 'string', format: 'email', maxLength: 255 },
				},
			},
			response: {
				201: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						data: {
							type: 'object',
							properties: {
								id: { type: 'string' },
								name: { type: 'string' },
								email: { type: 'string' },
								created_at: { type: 'string', format: 'date-time' },
								updated_at: { type: 'string', format: 'date-time' },
							},
						},
					},
				},
				409: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
				500: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
			},
		},
		handler: userController.createUser.bind(userController),
	});

	// Update an existing user
	fastify.put('/:id', {
		schema: {
			tags: ['users'],
			summary: 'Update an existing user',
			params: {
				type: 'object',
				required: ['id'],
				properties: {
					id: { type: 'string', format: 'uuid' },
				},
			},
			body: {
				type: 'object',
				properties: {
					name: { type: 'string', minLength: 2, maxLength: 255 },
					email: { type: 'string', format: 'email', maxLength: 255 },
				},
				additionalProperties: false,
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						data: {
							type: 'object',
							properties: {
								id: { type: 'string' },
								name: { type: 'string' },
								email: { type: 'string' },
								created_at: { type: 'string', format: 'date-time' },
								updated_at: { type: 'string', format: 'date-time' },
							},
						},
					},
				},
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
				409: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
				500: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
			},
		},
		handler: userController.updateUser.bind(userController),
	});

	// Delete a user
	fastify.delete('/:id', {
		schema: {
			tags: ['users'],
			summary: 'Delete a user',
			params: {
				type: 'object',
				required: ['id'],
				properties: {
					id: { type: 'string', format: 'uuid' },
				},
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' },
					},
				},
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
				500: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						message: { type: 'string' },
					},
				},
			},
		},
		handler: userController.deleteUser.bind(userController),
	});
}
