import { trace } from '@opentelemetry/api';
import {
	CreateUserInput,
	UpdateUserInput,
	User,
	UserRepository,
} from '../repositories/user.repository';

// Create a tracer for user service operations
const tracer = trace.getTracer('user-service');

export class UserService {
	private userRepository: UserRepository;

	constructor(userRepository: UserRepository = new UserRepository()) {
		this.userRepository = userRepository;
	}

	async getAllUsers(): Promise<User[]> {
		return tracer.startActiveSpan('UserService.getAllUsers', async (span) => {
			try {
				const users = await this.userRepository.findAll();
				span.setAttribute('users.count', users.length);
				return users;
			} catch (error) {
				span.recordException(error as Error);
				throw error;
			} finally {
				span.end();
			}
		});
	}

	async getUserById(id: string): Promise<User | null> {
		return tracer.startActiveSpan('UserService.getUserById', async (span) => {
			try {
				span.setAttribute('user.id', id);
				const user = await this.userRepository.findById(id);
				span.setAttribute('user.found', user !== null);
				return user;
			} catch (error) {
				span.recordException(error as Error);
				throw error;
			} finally {
				span.end();
			}
		});
	}

	async createUser(data: CreateUserInput): Promise<User> {
		return tracer.startActiveSpan('UserService.createUser', async (span) => {
			try {
				// Check if email is already in use
				const existingUser = await this.userRepository.findByEmail(data.email);
				if (existingUser) {
					const error = new Error(`Email ${data.email} is already in use`);
					span.recordException(error);
					throw error;
				}

				span.setAttribute('user.email', data.email);
				const user = await this.userRepository.create(data);
				span.setAttribute('user.id', user.id);
				return user;
			} catch (error) {
				span.recordException(error as Error);
				throw error;
			} finally {
				span.end();
			}
		});
	}

	async updateUser(id: string, data: UpdateUserInput): Promise<User | null> {
		return tracer.startActiveSpan('UserService.updateUser', async (span) => {
			try {
				span.setAttribute('user.id', id);

				// Check if user exists
				const existingUser = await this.userRepository.findById(id);
				if (!existingUser) {
					span.setAttribute('user.found', false);
					return null;
				}

				// Check if email is already in use by another user
				if (data.email && data.email !== existingUser.email) {
					const userWithEmail = await this.userRepository.findByEmail(
						data.email,
					);
					if (userWithEmail && userWithEmail.id !== id) {
						const error = new Error(`Email ${data.email} is already in use`);
						span.recordException(error);
						throw error;
					}
				}

				const updatedUser = await this.userRepository.update(id, data);
				span.setAttribute('user.updated', updatedUser !== null);
				return updatedUser;
			} catch (error) {
				span.recordException(error as Error);
				throw error;
			} finally {
				span.end();
			}
		});
	}

	async deleteUser(id: string): Promise<boolean> {
		return tracer.startActiveSpan('UserService.deleteUser', async (span) => {
			try {
				span.setAttribute('user.id', id);
				const result = await this.userRepository.delete(id);
				span.setAttribute('user.deleted', result);
				return result;
			} catch (error) {
				span.recordException(error as Error);
				throw error;
			} finally {
				span.end();
			}
		});
	}
}
