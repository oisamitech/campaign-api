import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../../services/user.service';
import { mockUserRepository, mockUsers } from '../mocks/user.repository.mock';

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', () => {
  return {
    trace: {
      getTracer: () => ({
        startActiveSpan: (name: string, fn: Function) => fn({
          setAttribute: vi.fn(),
          recordException: vi.fn(),
          end: vi.fn(),
        }),
      }),
    },
  };
});

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService(mockUserRepository);
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = await userService.getAllUsers();
      expect(users).toEqual(mockUsers);
      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle errors', async () => {
      mockUserRepository.findAll.mockRejectedValueOnce(new Error('Database error'));
      await expect(userService.getAllUsers()).rejects.toThrow('Database error');
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
      const userId = mockUsers[0].id;
      const user = await userService.getUserById(userId);
      expect(user).toEqual(mockUsers[0]);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent-id';
      mockUserRepository.findById.mockResolvedValueOnce(null);
      const user = await userService.getUserById(userId);
      expect(user).toBeNull();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
      };
      
      mockUserRepository.findByEmail.mockResolvedValueOnce(null);
      
      const newUser = await userService.createUser(userData);
      expect(newUser).toHaveProperty('id');
      expect(newUser.name).toBe(userData.name);
      expect(newUser.email).toBe(userData.email);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
    });

    it('should throw an error if email is already in use', async () => {
      const userData = {
        name: 'Duplicate User',
        email: mockUsers[0].email,
      };
      
      mockUserRepository.findByEmail.mockResolvedValueOnce(mockUsers[0]);
      
      await expect(userService.createUser(userData)).rejects.toThrow(
        `Email ${userData.email} is already in use`
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      const userId = mockUsers[0].id;
      const updateData = {
        name: 'Updated Name',
      };
      
      const updatedUser = {
        ...mockUsers[0],
        ...updateData,
        updated_at: expect.any(Date),
      };
      
      mockUserRepository.update.mockResolvedValueOnce(updatedUser);
      
      const result = await userService.updateUser(userId, updateData);
      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
    });

    it('should return null if user does not exist', async () => {
      const userId = 'non-existent-id';
      const updateData = {
        name: 'Updated Name',
      };
      
      mockUserRepository.findById.mockResolvedValueOnce(null);
      
      const result = await userService.updateUser(userId, updateData);
      expect(result).toBeNull();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw an error if email is already in use by another user', async () => {
      const userId = mockUsers[0].id;
      const updateData = {
        email: mockUsers[1].email,
      };
      
      mockUserRepository.findById.mockResolvedValueOnce(mockUsers[0]);
      mockUserRepository.findByEmail.mockResolvedValueOnce(mockUsers[1]);
      
      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        `Email ${updateData.email} is already in use`
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete an existing user', async () => {
      const userId = mockUsers[0].id;
      mockUserRepository.delete.mockResolvedValueOnce(true);
      
      const result = await userService.deleteUser(userId);
      expect(result).toBe(true);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should return false if user does not exist', async () => {
      const userId = 'non-existent-id';
      mockUserRepository.delete.mockResolvedValueOnce(false);
      
      const result = await userService.deleteUser(userId);
      expect(result).toBe(false);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });
  });
});
