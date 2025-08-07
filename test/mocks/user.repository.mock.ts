import { User, CreateUserInput, UpdateUserInput } from '../../repositories/user.repository';
import { vi } from 'vitest';

// Mock user data
export const mockUsers: User[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com',
    created_at: new Date('2023-01-01T00:00:00.000Z'),
    updated_at: new Date('2023-01-01T00:00:00.000Z'),
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    name: 'Jane Smith',
    email: 'jane@example.com',
    created_at: new Date('2023-01-02T00:00:00.000Z'),
    updated_at: new Date('2023-01-02T00:00:00.000Z'),
  },
];

// Mock UserRepository implementation
export const mockUserRepository = {
  findAll: vi.fn().mockResolvedValue(mockUsers),
  
  findById: vi.fn().mockImplementation((id: string) => {
    const user = mockUsers.find(u => u.id === id);
    return Promise.resolve(user || null);
  }),
  
  findByEmail: vi.fn().mockImplementation((email: string) => {
    const user = mockUsers.find(u => u.email === email);
    return Promise.resolve(user || null);
  }),
  
  create: vi.fn().mockImplementation((data: CreateUserInput) => {
    const newUser: User = {
      id: '323e4567-e89b-12d3-a456-426614174002',
      name: data.name,
      email: data.email,
      created_at: new Date(),
      updated_at: new Date(),
    };
    return Promise.resolve(newUser);
  }),
  
  update: vi.fn().mockImplementation((id: string, data: UpdateUserInput) => {
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) return Promise.resolve(null);
    
    const updatedUser = {
      ...mockUsers[userIndex],
      ...data,
      updated_at: new Date(),
    };
    
    return Promise.resolve(updatedUser);
  }),
  
  delete: vi.fn().mockImplementation((id: string) => {
    const userExists = mockUsers.some(u => u.id === id);
    return Promise.resolve(userExists);
  }),
};
