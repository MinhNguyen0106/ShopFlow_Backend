/**
 * ShopFlow - Unit Tests: page-member.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/page-member.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PageMemberRepository,
  PageMember,
  PageMemberWithUser,
} from '../page-member.repository.js';
import * as dbClient from '../../database/db.client.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('PageMemberRepository', () => {
  let repo: PageMemberRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PageMemberRepository();
  });

  const mockMember: PageMember = {
    id: 'pm-uuid-1',
    page_id: 'page-uuid-1',
    user_id: 'user-uuid-1',
    role: 'owner',
    invited_by: null,
    status: 'active',
    created_at: new Date('2026-10-24T00:00:00Z'),
    updated_at: new Date('2026-10-24T00:00:00Z'),
  };

  const mockMemberWithUser: PageMemberWithUser = {
    ...mockMember,
    email: 'owner@shopflow.vn',
    full_name: 'Nguyễn Văn Chủ Shop',
  };

  it('findById() trả về thành viên theo id', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockMember],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findById('pm-uuid-1');

    expect(result).toEqual(mockMember);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1'),
      ['pm-uuid-1']
    );
  });

  it('findByPageAndUser() trả về thành viên theo pageId và userId', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockMember],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.findByPageAndUser('page-uuid-1', 'user-uuid-1');

    expect(result).toEqual(mockMember);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN connected_pages cp ON cp.id = pm.page_id'),
      ['page-uuid-1', 'user-uuid-1']
    );
  });

  it('findByPageAndUser() trả về null nếu không tìm thấy', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
    });

    const result = await repo.findByPageAndUser('page-uuid-1', 'user-uuid-999');

    expect(result).toBeNull();
  });

  it('listByPageId() trả về danh sách thành viên kèm email và tên', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [mockMemberWithUser],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await repo.listByPageId('page-uuid-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe('owner@shopflow.vn');
    expect(result[0]?.role).toBe('owner');
  });

  it('createMember() chèn thành viên mới thành công', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [
        {
          ...mockMember,
          role: 'staff',
          invited_by: 'user-uuid-1',
        },
      ],
      rowCount: 1,
      command: 'INSERT',
    });

    const result = await repo.createMember({
      pageId: 'page-uuid-1',
      userId: 'user-uuid-2',
      role: 'staff',
      invitedBy: 'user-uuid-1',
    });

    expect(result.role).toBe('staff');
    expect(result.invited_by).toBe('user-uuid-1');
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO page_members'),
      ['page-uuid-1', 'user-uuid-2', 'staff', 'user-uuid-1', 'active']
    );
  });

  it('createMember() ném lỗi nếu database không trả về bản ghi', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: 'INSERT',
    });

    await expect(
      repo.createMember({
        pageId: 'page-uuid-1',
        userId: 'user-uuid-2',
        role: 'staff',
      })
    ).rejects.toThrow('[PageMemberRepository] Không thể tạo bản ghi thành viên mới');
  });

  it('updateRole() cập nhật vai trò thành công', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [{ ...mockMember, role: 'manager' }],
      rowCount: 1,
      command: 'UPDATE',
    });

    const result = await repo.updateRole('pm-uuid-1', 'manager');

    expect(result?.role).toBe('manager');
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('SET role = $1'),
      ['manager', 'pm-uuid-1']
    );
  });

  it('updateStatus() cập nhật trạng thái thành công', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [{ ...mockMember, status: 'revoked' }],
      rowCount: 1,
      command: 'UPDATE',
    });

    const result = await repo.updateStatus('pm-uuid-1', 'revoked');

    expect(result?.status).toBe('revoked');
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('SET status = $1'),
      ['revoked', 'pm-uuid-1']
    );
  });

  it('removeMember() xóa thành viên thành công', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
      command: 'DELETE',
    });

    const result = await repo.removeMember('pm-uuid-1');

    expect(result).toBe(true);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM page_members WHERE id = $1'),
      ['pm-uuid-1']
    );
  });

  it('countOwnersByPage() đếm chính xác số owner đang active', async () => {
    vi.mocked(dbClient.query).mockResolvedValueOnce({
      rows: [{ count: 2 }],
      rowCount: 1,
      command: 'SELECT',
    });

    const count = await repo.countOwnersByPage('page-uuid-1');

    expect(count).toBe(2);
    expect(dbClient.query).toHaveBeenCalledWith(
      expect.stringContaining("pm.role = 'owner' AND pm.status = 'active'"),
      ['page-uuid-1']
    );
  });
});
