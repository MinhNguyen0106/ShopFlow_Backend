/**
 * ShopFlow - Page Member Service
 * File: backend/src/core/services/page-member.service.ts
 *
 * Xử lý nghiệp vụ quản lý thành viên, phân quyền vai trò và mời nhân viên vào Fanpage.
 */

import {
  PageMemberRepository,
  pageMemberRepository,
  PageMember,
  PageMemberWithUser,
  PageRole,
} from '../../infrastructure/repositories/page-member.repository.js';
import {
  UserRepository,
  userRepository,
} from '../../infrastructure/repositories/user.repository.js';
import {
  ConnectedPageRepository,
  connectedPageRepository,
} from '../../infrastructure/repositories/connected-page.repository.js';
import {
  NotFoundError,
  BadRequestError,
} from '../errors/app-error.js';

export interface InviteMemberInput {
  email: string;
  role: 'manager' | 'staff';
}

export class PageMemberService {
  constructor(
    private readonly pageMemberRepo: PageMemberRepository = pageMemberRepository,
    private readonly userRepo: UserRepository = userRepository,
    private readonly pageRepo: ConnectedPageRepository = connectedPageRepository
  ) {}

  /**
   * Lấy danh sách thành viên của Fanpage kèm thông tin tài khoản.
   */
  async listMembers(pageId: string): Promise<PageMemberWithUser[]> {
    const page = await this.pageRepo.findById(pageId);
    if (!page) {
      throw new NotFoundError('Không tìm thấy Fanpage');
    }

    return this.pageMemberRepo.listByPageId(page.id);
  }

  /**
   * Mời một người dùng đã có tài khoản vào Fanpage theo địa chỉ email.
   */
  async inviteMember(
    pageId: string,
    inviterUserId: string,
    input: InviteMemberInput
  ): Promise<PageMember> {
    const page = await this.pageRepo.findById(pageId);
    if (!page) {
      throw new NotFoundError('Không tìm thấy Fanpage');
    }

    const targetUser = await this.userRepo.findByEmail(input.email);
    if (!targetUser) {
      throw new NotFoundError(
        'Không tìm thấy người dùng với địa chỉ email này trong hệ thống ShopFlow'
      );
    }

    // Kiểm tra xem người dùng đã là thành viên chưa
    const existingMember = await this.pageMemberRepo.findByPageAndUser(
      page.id,
      targetUser.id
    );

    if (existingMember) {
      if (existingMember.status === 'active') {
        throw new BadRequestError('Người dùng này đã là thành viên của Fanpage');
      }

      // Nếu đã từng bị thu hồi quyền, tái kích hoạt lại
      await this.pageMemberRepo.updateStatus(existingMember.id, 'active');
      const updated = await this.pageMemberRepo.updateRole(existingMember.id, input.role);
      if (!updated) {
        throw new BadRequestError('Không thể cập nhật quyền thành viên');
      }
      return updated;
    }

    return this.pageMemberRepo.createMember({
      pageId: page.id,
      userId: targetUser.id,
      role: input.role,
      invitedBy: inviterUserId,
      status: 'active',
    });
  }

  /**
   * Cập nhật vai trò (role) của thành viên.
   */
  async updateMemberRole(
    pageId: string,
    memberId: string,
    newRole: PageRole
  ): Promise<PageMember> {
    const page = await this.pageRepo.findById(pageId);
    if (!page) {
      throw new NotFoundError('Không tìm thấy Fanpage');
    }

    const member = await this.pageMemberRepo.findById(memberId);
    if (!member) {
      throw new NotFoundError('Không tìm thấy thành viên');
    }

    // Nếu thành viên hiện tại là owner và muốn đổi sang vai trò khác, kiểm tra xem còn owner nào khác không
    if (member.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await this.pageMemberRepo.countOwnersByPage(page.id);
      if (ownerCount <= 1) {
        throw new BadRequestError(
          'Không thể thay đổi vai trò của Chủ sở hữu duy nhất của Fanpage'
        );
      }
    }

    const updated = await this.pageMemberRepo.updateRole(memberId, newRole);
    if (!updated) {
      throw new NotFoundError('Không tìm thấy thành viên để cập nhật');
    }

    return updated;
  }

  /**
   * Xóa / Thu hồi quyền thành viên khỏi Fanpage.
   */
  async removeMember(pageId: string, memberId: string): Promise<boolean> {
    const page = await this.pageRepo.findById(pageId);
    if (!page) {
      throw new NotFoundError('Không tìm thấy Fanpage');
    }

    const member = await this.pageMemberRepo.findById(memberId);
    if (!member) {
      throw new NotFoundError('Không tìm thấy thành viên');
    }

    // Ngăn chặn xóa owner duy nhất
    if (member.role === 'owner') {
      const ownerCount = await this.pageMemberRepo.countOwnersByPage(page.id);
      if (ownerCount <= 1) {
        throw new BadRequestError(
          'Không thể xóa Chủ sở hữu duy nhất của Fanpage'
        );
      }
    }

    return this.pageMemberRepo.removeMember(memberId);
  }
}

export const pageMemberService = new PageMemberService();
