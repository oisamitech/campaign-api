import { FastifyReply, FastifyRequest } from 'fastify';
import {
	CreateUserInput,
	UpdateUserInput,
	UserIdParams,
} from '../schemas/user.schema';
import { UserService } from '../services/user.service';

export class UserController {
	private userService: UserService;

	constructor(userService: UserService = new UserService()) {
		this.userService = userService;
	}

	async getAllUsers(request: FastifyRequest, reply: FastifyReply) {
		try {
			const users = await this.userService.getAllUsers();
			return reply.code(200).send({ data: users });
		} catch (error) {
			request.log.error(error);
			return reply.code(500).send({
				error: 'Internal Server Error',
				message: 'An error occurred while retrieving users',
			});
		}
	}

	async getUserById(
		request: FastifyRequest<{ Params: UserIdParams }>,
		reply: FastifyReply,
	) {
		try {
			const { id } = request.params;
			const user = await this.userService.getUserById(id);

			if (!user) {
				return reply.code(404).send({
					error: 'Not Found',
					message: `User with ID ${id} not found`,
				});
			}

			return reply.code(200).send({ data: user });
		} catch (error) {
			request.log.error(error);
			return reply.code(500).send({
				error: 'Internal Server Error',
				message: 'An error occurred while retrieving the user',
			});
		}
	}

	async createUser(
		request: FastifyRequest<{ Body: CreateUserInput }>,
		reply: FastifyReply,
	) {
		try {
			const userData = request.body;
			const user = await this.userService.createUser(userData);

			return reply.code(201).send({
				message: 'User created successfully',
				data: user,
			});
		} catch (error: any) {
			request.log.error(error);

			// Handle duplicate email error
			if (error.message?.includes('already in use')) {
				return reply.code(409).send({
					error: 'Conflict',
					message: error.message,
				});
			}

			return reply.code(500).send({
				error: 'Internal Server Error',
				message: 'An error occurred while creating the user',
			});
		}
	}

	async updateUser(
		request: FastifyRequest<{ Params: UserIdParams; Body: UpdateUserInput }>,
		reply: FastifyReply,
	) {
		try {
			const { id } = request.params;
			const userData = request.body;

			const updatedUser = await this.userService.updateUser(id, userData);

			if (!updatedUser) {
				return reply.code(404).send({
					error: 'Not Found',
					message: `User with ID ${id} not found`,
				});
			}

			return reply.code(200).send({
				message: 'User updated successfully',
				data: updatedUser,
			});
		} catch (error: any) {
			request.log.error(error);

			// Handle duplicate email error
			if (error.message?.includes('already in use')) {
				return reply.code(409).send({
					error: 'Conflict',
					message: error.message,
				});
			}

			return reply.code(500).send({
				error: 'Internal Server Error',
				message: 'An error occurred while updating the user',
			});
		}
	}

	async deleteUser(
		request: FastifyRequest<{ Params: UserIdParams }>,
		reply: FastifyReply,
	) {
		try {
			const { id } = request.params;
			const deleted = await this.userService.deleteUser(id);

			if (!deleted) {
				return reply.code(404).send({
					error: 'Not Found',
					message: `User with ID ${id} not found`,
				});
			}

			return reply.code(200).send({
				message: 'User deleted successfully',
			});
		} catch (error) {
			request.log.error(error);
			return reply.code(500).send({
				error: 'Internal Server Error',
				message: 'An error occurred while deleting the user',
			});
		}
	}
}
