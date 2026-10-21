/**
 * ShopFlow - Socket.io Server Unit Tests
 * File: backend/src/infrastructure/socket/__tests__/socket.server.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, Server as HttpServer } from 'node:http';
import { Socket } from 'socket.io';
import {
  initSocketServer,
  getSocketServer,
  closeSocketServer,
  socketAuthMiddleware,
  AuthenticatedSocket,
} from '../socket.server.js';
import * as authHelper from '../../../utils/auth.helper.js';

describe('Socket.io Server Infrastructure', () => {
  let httpServer: HttpServer;

  beforeEach(() => {
    httpServer = createServer();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await closeSocketServer();
    httpServer.close();
  });

  describe('socketAuthMiddleware()', () => {
    it('từ chối kết nối nếu không có token trong handshake', () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {},
          query: {},
        },
      } as unknown as Socket;

      const next = vi.fn();
      socketAuthMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0]![0].message).toBe('UNAUTHORIZED');
    });

    it('từ chối kết nối nếu verifyAccessToken ném ra ngoại lệ (token hết hạn/sai)', () => {
      vi.spyOn(authHelper, 'verifyAccessToken').mockImplementation(() => {
        throw new Error('Token expired');
      });

      const mockSocket = {
        handshake: {
          auth: { token: 'invalid_token_123' },
          headers: {},
          query: {},
        },
      } as unknown as Socket;

      const next = vi.fn();
      socketAuthMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0]![0].message).toBe('UNAUTHORIZED');
    });

    it('chấp nhận kết nối và gán data.user khi token hợp lệ dạng Bearer', () => {
      const mockUser = {
        sub: 'user_123',
        id: 'user_123',
        email: 'test@shopflow.vn',
        role: 'owner' as const,
        token_type: 'access' as const,
      };

      vi.spyOn(authHelper, 'verifyAccessToken').mockReturnValue(mockUser);

      const mockSocket = {
        handshake: {
          auth: { token: 'Bearer valid_jwt_token' },
          headers: {},
          query: {},
        },
        data: {},
      } as unknown as AuthenticatedSocket;

      const next = vi.fn();
      socketAuthMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith();
      expect(mockSocket.data.user).toEqual(mockUser);
    });

    it('chấp nhận kết nối khi token nằm trong headers.authorization hoặc query', () => {
      const mockUser = {
        sub: 'user_456',
        id: 'user_456',
        email: 'query@shopflow.vn',
        role: 'staff' as const,
        token_type: 'access' as const,
      };

      vi.spyOn(authHelper, 'verifyAccessToken').mockReturnValue(mockUser);

      const mockSocket = {
        handshake: {
          auth: {},
          headers: { authorization: 'valid_header_token' },
          query: {},
        },
        data: {},
      } as unknown as AuthenticatedSocket;

      const next = vi.fn();
      socketAuthMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith();
      expect(mockSocket.data.user).toEqual(mockUser);
    });
  });

  describe('initSocketServer() & Connection lifecycle', () => {
    it('khởi tạo thành công Socket.io Server singleton và đóng an toàn', async () => {
      expect(getSocketServer()).toBeNull();

      const io = initSocketServer(httpServer);
      expect(io).toBeDefined();
      expect(getSocketServer()).toBe(io);

      // Gọi lại lần 2 trả về cùng instance
      const sameIo = initSocketServer(httpServer);
      expect(sameIo).toBe(io);

      await closeSocketServer();
      expect(getSocketServer()).toBeNull();
    });

    it('xử lý sự kiện connection, join_page, leave_page, join_conversation, leave_conversation', () => {
      const io = initSocketServer(httpServer);

      const mockSocket = {
        id: 'socket_test_001',
        data: {
          user: {
            id: 'u_111',
            email: 'admin@shopflow.vn',
            role: 'admin',
          },
        },
        join: vi.fn(),
        leave: vi.fn(),
        on: vi.fn(),
      };

      // Giả lập callback connection
      const connectionHandler =
        io.listeners('connection')[0] ||
        (io as any).sockets?.listeners?.('connection')?.[0] ||
        (io as any)._events?.connection;

      expect(connectionHandler).toBeDefined();

      connectionHandler(mockSocket);

      // Kiểm tra tự động join user room
      expect(mockSocket.join).toHaveBeenCalledWith('room:user_u_111');

      // Tìm và kích hoạt các event handlers
      const handlers: Record<string, Function> = {};
      for (const call of mockSocket.on.mock.calls) {
        handlers[call[0]] = call[1];
      }

      // 1. join_page
      handlers['join_page']?.({ pageId: 'page_abc' });
      expect(mockSocket.join).toHaveBeenCalledWith('room:page_page_abc');

      // 2. leave_page
      handlers['leave_page']?.({ pageId: 'page_abc' });
      expect(mockSocket.leave).toHaveBeenCalledWith('room:page_page_abc');

      // 3. join_conversation
      handlers['join_conversation']?.({ conversationId: 'conv_xyz' });
      expect(mockSocket.join).toHaveBeenCalledWith('room:conv_conv_xyz');

      // 4. leave_conversation
      handlers['leave_conversation']?.({ conversationId: 'conv_xyz' });
      expect(mockSocket.leave).toHaveBeenCalledWith('room:conv_conv_xyz');

      // 5. disconnect
      expect(() => handlers['disconnect']?.('transport close')).not.toThrow();
    });
  });
});
