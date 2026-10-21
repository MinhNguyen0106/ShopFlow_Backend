/**
 * ShopFlow - Unit Tests: facebook-account.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/facebook-account.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FacebookAccountRepository, FacebookAccount } from '../facebook-account.repository.js';
import * as dbClient from '../../database/db.client.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('FacebookAccountRepository', () => {
  let repo: FacebookAccountRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new FacebookAccountRepository();
  });

  const mockAccount: FacebookAccount = {
    id: 'fb-acc-uuid-1',
    user_id: 'user-uuid-1',
    fb_user_id: '123456789',
    fb_name: 'Nguyen Van A',
    user_access_token: 'iv:tag:encrypted',
    token_expires_at: new Date(Date.now() + 50000000),
    created_at: new Date(),
  };

  it('upsert() nên chèn hoặc cập nhật facebook account thành công', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockAccount],
      rowCount: 1,
      command: 'INSERT',
    });

    const result = await repo.upsert({
      userId: 'user-uuid-1',
      fbUserId: '123456789',
      fbName: 'Nguyen Van A',
      userAccessToken: 'iv:tag:encrypted',
      tokenExpiresAt: mockAccount.token_expires_at,
    });

    expect(result).toEqual(mockAccount);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (fb_user_id) DO UPDATE'),
      expect.any(Array)
    );
  });

  it('findByUserId() nên trả về tài khoản facebook của user', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockAccount],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findByUserId('user-uuid-1');
    expect(result).toEqual(mockAccount);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      ['user-uuid-1']
    );
  });

  it('findByUserId() nên trả về null khi không tìm thấy', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
    });

    const result = await repo.findByUserId('unknown-user');
    expect(result).toBeNull();
  });

  it('findByFbUserId() nên trả về tài khoản theo fb_user_id', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockAccount],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findByFbUserId('123456789');
    expect(result).toEqual(mockAccount);
  });

  it('deleteByUserId() nên xóa tài khoản theo user_id', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
      command: 'DELETE',
    });

    const result = await repo.deleteByUserId('user-uuid-1');
    expect(result).toBe(true);
  });
});
