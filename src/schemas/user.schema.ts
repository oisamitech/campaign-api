import { z } from 'zod';

// Schema for validating user IDs
export const userIdSchema = z.object({
	id: z.string().uuid('User ID must be a valid UUID'),
});

// Schema for creating a new user
export const createUserSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters').max(255),
	email: z.string().email('Invalid email address').max(255),
});

// Schema for updating an existing user
export const updateUserSchema = z
	.object({
		name: z
			.string()
			.min(2, 'Name must be at least 2 characters')
			.max(255)
			.optional(),
		email: z.string().email('Invalid email address').max(255).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update',
	});

// Types derived from schemas
export type UserIdParams = z.infer<typeof userIdSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
