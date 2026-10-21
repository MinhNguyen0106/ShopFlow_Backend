/**
 * ShopFlow - Socket.io Server Infrastructure
 * File: backend/src/infrastructure/socket/socket.server.ts
 *
 * Khởi tạo máy chủ WebSocket (Socket.io) tích hợp HTTP Server.
 * Hỗ trợ xác thực kết nối qua JWT Bearer token và định tuyến theo phòng (room:user, room:page, room:conv).
 */

import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../../utils/auth.helper.js';
import { JwtUserPayload } from '../../core/entities/user.entity.js';
import { logger } from '../../utils/logger.js';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: JwtUserPayload;
  };
}

let ioInstance: SocketIOServer | null = null;

/**
 * Middleware xác thực JWT token cho kết nối Socket.io.
 * Chấp nhận token từ `socket.handshake.auth.token`, `headers.authorization`, hoặc query `token`.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  try {
    const rawToken =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers?.authorization as string | undefined) ||
      (socket.handshake.query?.token as string | undefined);

    if (!rawToken) {
      logger.warn('[SocketIO] Kết nối bị từ chối: Thiếu JWT Token');
      return next(new Error('UNAUTHORIZED'));
    }

    const token = rawToken.startsWith('Bearer ')
      ? rawToken.slice(7).trim()
      : rawToken.trim();

    const payload = verifyAccessToken(token);
    (socket as AuthenticatedSocket).data = {
      user: payload,
    };

    next();
  } catch (error) {
    logger.warn(
      { err: (error as Error).message },
      '[SocketIO] Kết nối bị từ chối: Token không hợp lệ hoặc đã hết hạn'
    );
    next(new Error('UNAUTHORIZED'));
  }
}

/**
 * Khởi tạo Socket.io Server gắn liền với máy chủ HTTP.
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  if (ioInstance) {
    return ioInstance;
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Hỗ trợ kết nối từ mọi frontend trong mạng local & prod
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Áp dụng middleware xác thực
  io.use(socketAuthMiddleware);

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user;

    logger.info(
      { socketId: socket.id, userId: user.id, email: user.email },
      '[SocketIO] ✔ Người dùng kết nối thành công'
    );

    // Tự động đưa socket vào phòng riêng của người dùng
    const userRoom = `room:user_${user.id}`;
    void socket.join(userRoom);

    // Xử lý tham gia theo dõi Fanpage
    socket.on('join_page', (data: { pageId?: string }) => {
      if (data?.pageId) {
        const pageRoom = `room:page_${data.pageId}`;
        void socket.join(pageRoom);
        logger.debug(
          { socketId: socket.id, userId: user.id, pageRoom },
          '[SocketIO] Socket đã tham gia phòng Fanpage'
        );
      }
    });

    // Xử lý rời theo dõi Fanpage
    socket.on('leave_page', (data: { pageId?: string }) => {
      if (data?.pageId) {
        const pageRoom = `room:page_${data.pageId}`;
        void socket.leave(pageRoom);
        logger.debug(
          { socketId: socket.id, userId: user.id, pageRoom },
          '[SocketIO] Socket đã rời phòng Fanpage'
        );
      }
    });

    // Xử lý tham gia hội thoại chi tiết
    socket.on('join_conversation', (data: { conversationId?: string }) => {
      if (data?.conversationId) {
        const convRoom = `room:conv_${data.conversationId}`;
        void socket.join(convRoom);
        logger.debug(
          { socketId: socket.id, userId: user.id, convRoom },
          '[SocketIO] Socket đã tham gia phòng Hội thoại'
        );
      }
    });

    // Xử lý rời hội thoại chi tiết
    socket.on('leave_conversation', (data: { conversationId?: string }) => {
      if (data?.conversationId) {
        const convRoom = `room:conv_${data.conversationId}`;
        void socket.leave(convRoom);
        logger.debug(
          { socketId: socket.id, userId: user.id, convRoom },
          '[SocketIO] Socket đã rời phòng Hội thoại'
        );
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(
        { socketId: socket.id, userId: user.id, reason },
        '[SocketIO] Người dùng đã ngắt kết nối'
      );
    });
  });

  ioInstance = io;
  return ioInstance;
}

/**
 * Lấy instance Socket.io hiện tại (trả về null nếu chưa khởi tạo).
 */
export function getSocketServer(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Đóng an toàn kết nối Socket.io Server (dùng khi shutdown hoặc chạy test).
 */
export async function closeSocketServer(): Promise<void> {
  if (ioInstance) {
    await new Promise<void>((resolve) => {
      ioInstance?.close(() => {
        logger.info('[SocketIO] Đã đóng máy chủ Socket.io an toàn');
        resolve();
      });
    });
    ioInstance = null;
  }
}
