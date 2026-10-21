/**
 * ShopFlow - Unit Tests: user.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/user.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '../user.repository.js';
import * as dbClient from '../../database/db.client.js';
import { User } from '../../../core/entities/user.entity.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new UserRepository();
  });

  describe('findByEmail()', () => {
    it('nên tìm thấy user khi email tồn tại', async () => {
      const mockUser: User = {
        id:            'user-1',
        email:         'test@shopflow.vn',
        password_hash: 'hash',
        full_name:     'Test User',
        role:          'owner',
        status:        'active',
        created_at:    new Date(),
        updated_at:    new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
      });

      const user = await repo.findByEmail('test@shopflow.vn');

      expect(user).toEqual(mockUser);
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE LOWER(email) = LOWER($1)'),
        ['test@shopflow.vn']
      );
    });

    it('nên trả về null khi không tìm thấy user', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
      });

      const user = await repo.findByEmail('notfound@shopflow.vn');
      expect(user).toBeNull();
    });
  });

  describe('findById()', () => {
    it('nên tìm thấy user theo UUID', async () => {
      const mockUser: User = {
        id:            'uuid-123',
        email:         'id@shopflow.vn',
        password_hash: 'hash',
        full_name:     'ID User',
        role:          'staff',
        status:        'active',
        created_at:    new Date(),
        updated_at:    new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
      });

      const user = await repo.findById('uuid-123');

      expect(user).toEqual(mockUser);
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['uuid-123']
      );
    });

    it('nên trả về null khi không tìm thấy ID', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
      });

      const user = await repo.findById('non-existent-uuid');
      expect(user).toBeNull();
    });
  });

  describe('create()', () => {
    it('nên insert bản ghi mới và trả về User vừa tạo', async () => {
      const createdUser: User = {
        id:            'new-id',
        email:         'new@shopflow.vn',
        password_hash: 'new_hash',
        full_name:     'New User',
        role:          'owner',
        status:        'active',
        created_at:    new Date(),
        updated_at:    new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [createdUser],
        rowCount: 1,
        command: 'INSERT',
      });

      const user = await repo.create({
        email:         'new@shopflow.vn',
        password_hash: 'new_hash',
        full_name:     'New User',
        role:          'owner',
      });

      expect(user).toEqual(createdUser);
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['new@shopflow.vn', 'new_hash', 'New User', 'owner']
      );
    });

    it('nên throw error nếu query không trả về row nào', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'INSERT',
      });

      await expect(
        repo.create({
          email:         'fail@shopflow.vn',
          password_hash: 'hash',
          full_name:     'Fail User',
        })
      ).rejects.toThrow('Không thể tạo bản ghi người dùng mới');
    });
  });

  describe('updateStatus()', () => {
    it('nên cập nhật status và trả về User sau cập nhật', async () => {
      const updatedUser: User = {
        id:            'user-status',
        email:         'status@shopflow.vn',
        password_hash: 'hash',
        full_name:     'Status User',
        role:          'staff',
        status:        'suspended',
        created_at:    new Date(),
        updated_at:    new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [updatedUser],
        rowCount: 1,
        command: 'UPDATE',
      });

      const result = await repo.updateStatus('user-status', 'suspended');

      expect(result).toEqual(updatedUser);
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['suspended', 'user-status']
      );
    });

    it('nên trả về null nếu user cần update không tồn tại', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
      });

      const result = await repo.updateStatus('missing-id', 'inactive');
      expect(result).toBeNull();
    });
  });
});
