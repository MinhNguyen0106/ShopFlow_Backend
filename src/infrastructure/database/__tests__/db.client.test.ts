/**
 * ShopFlow - Unit Tests: db.client.ts
 * File: backend/src/infrastructure/database/__tests__/db.client.test.ts
 *
 * Chiến lược:
 *   - Mock module 'pg' sử dụng vi.hoisted() của Vitest
 *   - Kiểm tra: Singleton pattern, query profiling, transaction logic,
 *     error handling, graceful shutdown hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Hoisted mocks — khởi tạo trước tất cả imports
// =============================================================================

const { mockPoolInstance } = vi.hoisted(() => {
  const instance = {
    query:      vi.fn(),
    connect:    vi.fn(),
    end:        vi.fn(),
    on:         vi.fn(),
    totalCount: 5,
    idleCount:  3,
  };
  return { mockPoolInstance: instance };
});

vi.mock('pg', () => ({
  default: { Pool: vi.fn(() => mockPoolInstance) },
  Pool:    vi.fn(() => mockPoolInstance),
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    info:  vi.fn(),
    debug: vi.fn(),
    warn:  vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://shopflow_user:test_pass@localhost:5432/shopflow_test',
    NODE_ENV:     'test',
  },
}));

// =============================================================================
// Import db.client SAU khi đã mock
// =============================================================================
import {
  query,
  withTransaction,
  testConnection,
  closePool,
  registerShutdownHooks,
  getPool,
} from '../db.client.js';

// =============================================================================
// Reset helper
// =============================================================================
async function resetPool() {
  await closePool();
  mockPoolInstance.query.mockReset();
  mockPoolInstance.connect.mockReset();
  mockPoolInstance.end.mockReset();
  mockPoolInstance.on.mockReset();
}

// =============================================================================
// Tests: query()
// =============================================================================

describe('db.client — query()', () => {
  beforeEach(async () => {
    await resetPool();
  });

  it('nên thực thi SQL và trả về QueryResult đúng kiểu', async () => {
    const mockRows = [{ id: 'uuid-1', email: 'test@shopflow.com' }];
    mockPoolInstance.query.mockResolvedValueOnce({
      rows: mockRows, rowCount: 1, command: 'SELECT',
    });

    const result = await query<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE id = $1',
      ['uuid-1']
    );

    expect(result.rows).toEqual(mockRows);
    expect(result.rowCount).toBe(1);
    expect(result.command).toBe('SELECT');
  });

  it('nên truyền đúng SQL text và params vào pool.query', async () => {
    mockPoolInstance.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' });

    await query('SELECT 1 WHERE $1', ['value']);

    expect(mockPoolInstance.query).toHaveBeenCalledWith('SELECT 1 WHERE $1', ['value']);
  });

  it('nên trả về rowCount = 0 khi result.rowCount là null', async () => {
    mockPoolInstance.query.mockResolvedValueOnce({ rows: [], rowCount: null, command: 'INSERT' });

    const result = await query('INSERT ...');
    expect(result.rowCount).toBe(0);
  });

  it('nên throw lỗi khi PostgreSQL báo lỗi constraint', async () => {
    const dbError = new Error('duplicate key value violates unique constraint');
    mockPoolInstance.query.mockRejectedValueOnce(dbError);

    await expect(
      query('INSERT INTO users (email) VALUES ($1)', ['existing@test.com'])
    ).rejects.toThrow('duplicate key value violates unique constraint');
  });

  it('nên xử lý query không có params (undefined)', async () => {
    mockPoolInstance.query.mockResolvedValueOnce({ rows: [{ now: new Date() }], rowCount: 1, command: 'SELECT' });

    const result = await query('SELECT NOW()');
    expect(result.rows).toHaveLength(1);
    expect(mockPoolInstance.query).toHaveBeenCalledWith('SELECT NOW()', undefined);
  });
});

// =============================================================================
// Tests: withTransaction()
// =============================================================================

describe('db.client — withTransaction()', () => {
  beforeEach(async () => {
    await resetPool();
  });

  it('nên gọi BEGIN → callback → COMMIT theo đúng thứ tự', async () => {
    const callOrder: string[] = [];

    const mockClient = {
      query:   vi.fn(),
      release: vi.fn(),
    };

    mockPoolInstance.connect.mockResolvedValueOnce(mockClient);

    mockClient.query
      .mockImplementationOnce(async () => { callOrder.push('BEGIN'); return { rows: [], rowCount: 0 }; })
      .mockImplementationOnce(async () => { callOrder.push('callback-query'); return { rows: [{ id: 'new-id' }], rowCount: 1, command: 'INSERT' }; })
      .mockImplementationOnce(async () => { callOrder.push('COMMIT'); return { rows: [], rowCount: 0 }; });

    const result = await withTransaction(async (client) => {
      const res = await client.query<{ id: string }>('INSERT ... RETURNING id');
      return res.rows[0];
    });

    expect(callOrder).toEqual(['BEGIN', 'callback-query', 'COMMIT']);
    expect(result).toEqual({ id: 'new-id' });
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('nên gọi ROLLBACK khi callback throw lỗi', async () => {
    const callOrder: string[] = [];

    const mockClient = {
      query:   vi.fn()
        .mockImplementationOnce(async () => { callOrder.push('BEGIN'); return {}; })
        .mockImplementationOnce(() => { throw new Error('Constraint violation'); })
        .mockImplementationOnce(async () => { callOrder.push('ROLLBACK'); return {}; }),
      release: vi.fn(),
    };

    mockPoolInstance.connect.mockResolvedValueOnce(mockClient);

    await expect(
      withTransaction(async (client) => {
        await client.query('INSERT INTO users ...');
      })
    ).rejects.toThrow('Constraint violation');

    expect(callOrder).toContain('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('nên luôn gọi release() ngay cả khi có lỗi', async () => {
    const mockClient = {
      query:   vi.fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Query error'))
        .mockResolvedValueOnce({}),
      release: vi.fn(),
    };

    mockPoolInstance.connect.mockResolvedValueOnce(mockClient);

    await expect(
      withTransaction(async (client) => {
        await client.query('SELECT 1');
      })
    ).rejects.toThrow();

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('nên trả về giá trị từ callback khi thành công', async () => {
    const mockClient = {
      query:   vi.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ total: 7 }], rowCount: 1, command: 'SELECT' })
        .mockResolvedValueOnce({}),
      release: vi.fn(),
    };

    mockPoolInstance.connect.mockResolvedValueOnce(mockClient);

    const total = await withTransaction(async (client) => {
      const res = await client.query<{ total: number }>('SELECT COUNT(*) as total FROM users');
      return res.rows[0]?.total ?? 0;
    });

    expect(total).toBe(7);
  });
});

// =============================================================================
// Tests: testConnection()
// =============================================================================

describe('db.client — testConnection()', () => {
  beforeEach(async () => {
    await resetPool();
  });

  it('nên trả về true khi PostgreSQL phản hồi bình thường', async () => {
    mockPoolInstance.query.mockResolvedValueOnce({
      rows: [{ now: new Date(), version: 'PostgreSQL 15.4 on x86_64' }],
      rowCount: 1,
      command:  'SELECT',
    });

    const result = await testConnection();
    expect(result).toBe(true);
  });

  it('nên trả về false khi không thể kết nối', async () => {
    mockPoolInstance.query.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await testConnection();
    expect(result).toBe(false);
  });
});

// =============================================================================
// Tests: closePool()
// =============================================================================

describe('db.client — closePool()', () => {
  beforeEach(async () => {
    await resetPool();
  });

  it('nên không throw khi pool chưa được khởi tạo', async () => {
    await expect(closePool()).resolves.toBeUndefined();
  });

  it('nên gọi pool.end() và resolve khi thành công', async () => {
    mockPoolInstance.query.mockResolvedValueOnce({
      rows: [{ now: new Date(), version: 'PG 15' }],
      rowCount: 1, command: 'SELECT',
    });
    mockPoolInstance.end.mockResolvedValueOnce(undefined);

    await testConnection();
    await closePool();

    expect(mockPoolInstance.end).toHaveBeenCalledTimes(1);
  });

  it('nên throw lỗi khi pool.end() thất bại', async () => {
    mockPoolInstance.query.mockResolvedValueOnce({
      rows: [{ now: new Date(), version: 'PG 15' }],
      rowCount: 1, command: 'SELECT',
    });
    mockPoolInstance.end.mockRejectedValueOnce(new Error('End failed'));

    await testConnection();
    await expect(closePool()).rejects.toThrow('End failed');
  });
});

// =============================================================================
// Tests: registerShutdownHooks() & getPool()
// =============================================================================

describe('db.client — registerShutdownHooks() & getPool()', () => {
  it('nên đăng ký process listeners cho SIGINT và SIGTERM', () => {
    const processOnceSpy = vi.spyOn(process, 'once');

    registerShutdownHooks();

    expect(processOnceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(processOnceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    processOnceSpy.mockRestore();
  });

  it('nên export getPool trả về pool instance', () => {
    const pool = getPool();
    expect(pool).toBeDefined();
  });
});
