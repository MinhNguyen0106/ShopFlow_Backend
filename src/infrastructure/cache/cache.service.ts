/**
 * ShopFlow - Redis Cache Service (TASK-26.1)
 * File: backend/src/infrastructure/cache/cache.service.ts
 *
 * Cung cấp tầng bộ nhớ đệm Cache-Aside tập trung với Redis:
 * - Hỗ trợ get, set với TTL tùy chọn
 * - Hỗ trợ xóa theo pattern sử dụng lệnh SCAN chống nghẽn Redis
 * - Hỗ trợ getOrSet tiện lợi
 * - Cơ chế fallback an toàn: không crash ứng dụng nếu Redis gián đoạn
 */

import { Redis, RedisOptions } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidateByPattern(pattern: string): Promise<number>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
  disconnect(): Promise<void>;
}

export class CacheService implements ICacheService {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor(customClient?: Redis) {
    if (customClient) {
      this.redis = customClient;
      this.isConnected = true;
    }
  }

  /**
   * Khởi tạo kết nối Redis client cho tầng Cache
   */
  private getClient(): Redis | null {
    if (this.redis) {
      return this.redis;
    }

    try {
      const redisOptions: RedisOptions = {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        enableReadyCheck: true,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 5) {
            return null; // Dừng retry nếu quá 5 lần thất bại liên tiếp
          }
          return Math.min(times * 200, 2000);
        },
      };

      this.redis = new Redis(redisOptions);

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('[CacheService] Kết nối Redis Cache thành công');
      });

      this.redis.on('error', (err) => {
        this.isConnected = false;
        logger.warn({ err: err.message }, '[CacheService] Cảnh báo kết nối Redis Cache');
      });

      this.redis.on('close', () => {
        this.isConnected = false;
      });

      // Kích hoạt kết nối không blocking
      this.redis.connect().catch((err) => {
        logger.warn({ err: (err as Error).message }, '[CacheService] Chưa thể kết nối Redis, chuyển sang fallback mode');
      });

      return this.redis;
    } catch (err) {
      logger.warn({ err }, '[CacheService] Lỗi tạo Redis client, sử dụng chế độ no-cache fallback');
      return null;
    }
  }

  /**
   * Lấy dữ liệu từ cache theo key
   */
  async get<T>(key: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const raw = await client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn({ key, err: (err as Error).message }, '[CacheService] Lỗi khi get cache');
      return null;
    }
  }

  /**
   * Lưu dữ liệu vào cache kèm thời gian sống (TTL theo giây)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await client.set(key, payload);
      }
    } catch (err) {
      logger.warn({ key, err: (err as Error).message }, '[CacheService] Lỗi khi set cache');
    }
  }

  /**
   * Xóa 1 khóa cache cụ thể
   */
  async del(key: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.del(key);
    } catch (err) {
      logger.warn({ key, err: (err as Error).message }, '[CacheService] Lỗi khi del cache');
    }
  }

  /**
   * Xóa toàn bộ các khóa cache thỏa mãn pattern (sử dụng SCAN để không block server)
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;

    let cursor = '0';
    let deletedCount = 0;

    try {
      do {
        const scanRes = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        const nextCursor = scanRes[0] ?? '0';
        const keys = scanRes[1] ?? [];
        cursor = nextCursor;

        if (keys.length > 0) {
          await client.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        logger.debug({ pattern, deletedCount }, '[CacheService] Đã hủy cache theo mẫu');
      }

      return deletedCount;
    } catch (err) {
      logger.warn({ pattern, err: (err as Error).message }, '[CacheService] Lỗi khi scan & invalidate cache');
      return 0;
    }
  }

  /**
   * Cache-Aside Pattern helper: Lấy từ cache nếu có, nếu chưa thì gọi hàm factory lấy dữ liệu và lưu cache
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 600): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await factory();
    if (freshData !== undefined && freshData !== null) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }

  /**
   * Đóng kết nối Redis phục vụ shutdown hoặc test teardown
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
      this.redis = null;
      this.isConnected = false;
    }
  }
}

export const cacheService = new CacheService();
