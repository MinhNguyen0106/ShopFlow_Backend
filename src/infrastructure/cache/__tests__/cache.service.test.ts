/**
 * ShopFlow - CacheService Unit Tests (TASK-26.1)
 * File: backend/src/infrastructure/cache/__tests__/cache.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '../cache.service.js';

describe('CacheService Unit Tests', () => {
  let cacheService: CacheService;
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    scan: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      scan: vi.fn(),
      quit: vi.fn(),
      disconnect: vi.fn(),
    };

    cacheService = new CacheService(mockRedis as unknown as any);
  });

  describe('get', () => {
    it('trả về dữ liệu đã parse JSON khi tìm thấy khóa trong cache', async () => {
      const mockData = { id: 'p-1', name: 'Sản phẩm Test', price: 200000 };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await cacheService.get<typeof mockData>('test:key');

      expect(mockRedis.get).toHaveBeenCalledWith('test:key');
      expect(result).toEqual(mockData);
    });

    it('trả về null khi không tìm thấy khóa', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await cacheService.get('missing:key');

      expect(result).toBeNull();
    });

    it('bắt lỗi an toàn và trả về null khi Redis ném ngoại lệ', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection error'));

      const result = await cacheService.get('error:key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('lưu dữ liệu có thời hạn (TTL) sử dụng tham số EX', async () => {
      const data = { status: 'active' };
      mockRedis.set.mockResolvedValueOnce('OK');

      await cacheService.set('test:ttl', data, 300);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:ttl',
        JSON.stringify(data),
        'EX',
        300
      );
    });

    it('lưu dữ liệu không có TTL khi ttlSeconds không được truyền', async () => {
      const data = { setting: 'dark_mode' };
      mockRedis.set.mockResolvedValueOnce('OK');

      await cacheService.set('test:no-ttl', data);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:no-ttl',
        JSON.stringify(data)
      );
    });
  });

  describe('del', () => {
    it('xóa một khóa cache cụ thể', async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      await cacheService.del('cache:item:123');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:item:123');
    });
  });

  describe('invalidateByPattern', () => {
    it('quét các khóa bằng SCAN và xóa toàn bộ các khóa khớp với pattern', async () => {
      // Giả lập SCAN 2 vòng lặp: vòng 1 trả về cursor 42, vòng 2 trả về cursor 0 (kết thúc)
      mockRedis.scan
        .mockResolvedValueOnce(['42', ['cache:products:1', 'cache:products:2']])
        .mockResolvedValueOnce(['0', ['cache:products:3']]);
      mockRedis.del.mockResolvedValue(2);

      const deletedCount = await cacheService.invalidateByPattern('cache:products:*');

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith('cache:products:1', 'cache:products:2');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:products:3');
      expect(deletedCount).toBe(3);
    });

    it('trả về 0 khi không có khóa nào khớp', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]);

      const deletedCount = await cacheService.invalidateByPattern('cache:empty:*');

      expect(deletedCount).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('trả về dữ liệu từ cache và không gọi hàm factory khi cache HIT', async () => {
      const cachedValue = { message: 'hello from cache' };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedValue));
      const factory = vi.fn();

      const result = await cacheService.getOrSet('greet:key', factory, 600);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('gọi hàm factory và lưu kết quả vào cache khi cache MISS', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const freshValue = { message: 'fresh from db' };
      const factory = vi.fn().mockResolvedValueOnce(freshValue);
      mockRedis.set.mockResolvedValueOnce('OK');

      const result = await cacheService.getOrSet('greet:key', factory, 600);

      expect(result).toEqual(freshValue);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'greet:key',
        JSON.stringify(freshValue),
        'EX',
        600
      );
    });
  });
});
