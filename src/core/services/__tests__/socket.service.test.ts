/**
 * ShopFlow - Socket Service Unit Tests
 * File: backend/src/core/services/__tests__/socket.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocketService } from '../socket.service.js';
import * as socketServerModule from '../../../infrastructure/socket/socket.server.js';

describe('SocketService', () => {
  let socketService: SocketService;
  let mockIo: any;

  beforeEach(() => {
    socketService = new SocketService();
    vi.restoreAllMocks();

    mockIo = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
  });

  describe('emitNewInboxItem()', () => {
    it('bỏ qua an toàn khi Socket.io chưa được khởi tạo', () => {
      vi.spyOn(socketServerModule, 'getSocketServer').mockReturnValue(null);

      expect(() => {
        socketService.emitNewInboxItem('page_123', {
          event: 'NEW_INBOX_ITEM',
          page_id: 'page_123',
          conversation_id: 'conv_123',
          type: 'comment_thread',
          customer: {
            id: 'c_1',
            customer_fb_id: 'fb_1',
            customer_name: 'Nguyễn Văn A',
            phone_number: null,
            tags: [],
          },
          message: {
            id: 'm_1',
            meta_id: 'meta_1',
            sender_type: 'customer',
            sender_fb_id: 'fb_1',
            content: 'Chào shop',
            is_hidden: false,
            private_reply_sent: false,
            created_at: new Date().toISOString(),
          },
          unread_count: 1,
          window_24h_expires_at: null,
        });
      }).not.toThrow();
    });

    it('phát đúng sự kiện NEW_INBOX_ITEM tới phòng room:page_{pageId}', () => {
      vi.spyOn(socketServerModule, 'getSocketServer').mockReturnValue(mockIo);

      const payload: any = {
        event: 'NEW_INBOX_ITEM',
        page_id: 'page_123',
        conversation_id: 'conv_123',
      };

      socketService.emitNewInboxItem('page_123', payload);

      expect(mockIo.to).toHaveBeenCalledWith('room:page_page_123');
      expect(mockIo.emit).toHaveBeenCalledWith('NEW_INBOX_ITEM', payload);
    });
  });

  describe('emitInboxUpdated()', () => {
    it('bỏ qua an toàn khi Socket.io chưa khởi tạo', () => {
      vi.spyOn(socketServerModule, 'getSocketServer').mockReturnValue(null);

      expect(() => {
        socketService.emitInboxUpdated('page_123', {
          event: 'INBOX_UPDATED',
          page_id: 'page_123',
          conversation_id: 'conv_123',
          updated_fields: { status: 'resolved' },
        });
      }).not.toThrow();
    });

    it('phát đúng sự kiện INBOX_UPDATED tới phòng page và phòng conversation', () => {
      vi.spyOn(socketServerModule, 'getSocketServer').mockReturnValue(mockIo);

      const payload: any = {
        event: 'INBOX_UPDATED',
        page_id: 'page_123',
        conversation_id: 'conv_123',
        updated_fields: { unread_count: 0 },
      };

      socketService.emitInboxUpdated('page_123', payload);

      expect(mockIo.to).toHaveBeenCalledWith('room:page_page_123');
      expect(mockIo.to).toHaveBeenCalledWith('room:conv_conv_123');
      expect(mockIo.emit).toHaveBeenCalledWith('INBOX_UPDATED', payload);
    });
  });

  describe('emitPostStatusChanged()', () => {
    it('bỏ qua an toàn khi Socket.io chưa khởi tạo', () => {
      vi.spyOn(socketServerModule, 'getSocketServer').mockReturnValue(null);

      expect(() => {
        socketService.emitPostStatusChanged('page_123', {
          event: 'POST_STATUS_CHANGED',
          post_id: 'p_1',
          page_id: 'page_123',
          status: 'published',
          meta_post_id: 'meta_p1',
          error_message: null,
          published_at: new Date().toISOString(),
        });
      }).not.toThrow();
    });

    it('phát đúng sự kiện POST_STATUS_CHANGED tới phòng room:page_{pageId}', () => {
      vi.spyOn(socketServerModule, 'getSocketServer').mockReturnValue(mockIo);

      const payload: any = {
        event: 'POST_STATUS_CHANGED',
        post_id: 'p_1',
        page_id: 'page_123',
        status: 'published',
      };

      socketService.emitPostStatusChanged('page_123', payload);

      expect(mockIo.to).toHaveBeenCalledWith('room:page_page_123');
      expect(mockIo.emit).toHaveBeenCalledWith('POST_STATUS_CHANGED', payload);
    });
  });
});
