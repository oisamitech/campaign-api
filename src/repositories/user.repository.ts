import { randomUUID } from 'node:crypto';
import { query } from '../database/connection';

export interface User {
	id: string;
	name: string;
	email: string;
	created_at?: Date;
	updated_at?: Date;
}

export interface CreateUserInput {
	name: string;
	email: string;
}

export interface UpdateUserInput {
	name?: string;
	email?: string;
}

export class UserRepository {
	async findAll(): Promise<User[]> {
		return query<User[]>('SELECT * FROM users ORDER BY created_at DESC');
	}

	async findById(id: string): Promise<User | null> {
		const users = await query<User[]>('SELECT * FROM users WHERE id = ?', [id]);
		return users.length > 0 ? users[0] : null;
	}

	async findByEmail(email: string): Promise<User | null> {
		const users = await query<User[]>('SELECT * FROM users WHERE email = ?', [
			email,
		]);
		return users.length > 0 ? users[0] : null;
	}

	async create(data: CreateUserInput): Promise<User> {
		const id = randomUUID();
		await query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
			id,
			data.name,
			data.email,
		]);

		return this.findById(id) as Promise<User>;
	}

	async update(id: string, data: UpdateUserInput): Promise<User | null> {
		const user = await this.findById(id);
		if (!user) return null;

		const fields: string[] = [];
		const values: any[] = [];

		if (data.name !== undefined) {
			fields.push('name = ?');
			values.push(data.name);
		}

		if (data.email !== undefined) {
			fields.push('email = ?');
			values.push(data.email);
		}

		if (fields.length === 0) return user;

		values.push(id);
		await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

		return this.findById(id);
	}

	async delete(id: string): Promise<boolean> {
		const result = await query<{ affectedRows: number }>(
			'DELETE FROM users WHERE id = ?',
			[id],
		);

		return result.affectedRows > 0;
	}
}
