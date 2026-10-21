/**
 * ShopFlow - Database Client (pg.Pool Singleton)
 * File: backend/src/infrastructure/database/db.client.ts
 *
 * Cung cấp một instance pg.Pool duy nhất (Singleton) cho toàn bộ ứng dụng.
 * Tính năng:
 *   - query()           : Thực thi SQL có typed result + query profiling log
 *   - withTransaction() : Wrapper transaction an toàn (BEGIN/COMMIT/ROLLBACK)
 *   - testConnection()  : Kiểm tra kết nối khi server khởi động
 *   - Graceful shutdown : Đóng pool an toàn khi nhận SIGINT/SIGTERM
 */

import pg from 'pg';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// =============================================================================
// Kiểu dữ liệu nội bộ
// =============================================================================

/** Kết quả trả về từ hàm query() - typed theo generic T */
export interface QueryResult<T extends pg.QueryResultRow = pg.QueryResultRow> {
  rows: T[];
  rowCount: number;
  command: string;
}

/** Callback cho withTransaction() */
export type TransactionCallback<T> = (client: pg.PoolClient) => Promise<T>;

// =============================================================================
// Cấu hình Pool
// =============================================================================
const POOL_CONFIG: pg.PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: 20,                      // Tối đa 20 connection đồng thời
  idleTimeoutMillis: 30_000,    // Đóng connection nhàn rỗi sau 30 giây
  connectionTimeoutMillis: 5_000, // Timeout chờ connection khả dụng sau 5 giây
  // Statement timeout 30s để tránh query treo vô hạn
  statement_timeout: 30_000,
  // Tự động idle connection sau 10 phút không dùng
  allowExitOnIdle: false,
};

// =============================================================================
// Singleton Pool Instance
// =============================================================================
let _pool: pg.Pool | null = null;

/**
 * Trả về instance pg.Pool duy nhất (Singleton).
 * Throws Error nếu DATABASE_URL chưa được cấu hình.
 */
function getPool(): pg.Pool {
  if (_pool !== null) {
    return _pool;
  }

  if (!env.DATABASE_URL) {
    throw new Error(
      '[db.client] DATABASE_URL chưa được thiết lập trong biến môi trường.\n' +
      '  Hãy kiểm tra file backend/.env và đảm bảo DATABASE_URL được cấu hình đúng.\n' +
      '  Ví dụ: DATABASE_URL=postgresql://shopflow_user:password@localhost:5432/shopflow_db'
    );
  }

  _pool = new pg.Pool(POOL_CONFIG);

  // Ghi log khi có lỗi kết nối idle
  _pool.on('error', (err: Error, _client: pg.PoolClient) => {
    logger.error({ err: err.message }, '[db.client] Lỗi connection pool không mong đợi');
  });

  // Ghi log khi pool kết nối thành công lần đầu
  _pool.on('connect', (_client: pg.PoolClient) => {
    logger.debug('[db.client] Kết nối mới được tạo trong pool');
  });

  logger.info(
    { max: POOL_CONFIG.max, idleTimeout: POOL_CONFIG.idleTimeoutMillis },
    '[db.client] pg.Pool khởi tạo thành công'
  );

  return _pool;
}

// =============================================================================
// query() — Thực thi SQL với query profiling
// =============================================================================

/**
 * Thực thi một câu SQL với tham số hóa (Prepared Statement).
 *
 * @param text   - Câu SQL với placeholder $1, $2, ...
 * @param params - Mảng tham số tương ứng (hoặc undefined)
 * @returns      - QueryResult<T> với rows và rowCount
 *
 * @example
 * const result = await query<{ id: string; email: string }>(
 *   'SELECT id, email FROM users WHERE email = $1',
 *   [email]
 * );
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool  = getPool();
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Query profiling: warn nếu query chạy lâu hơn 1 giây
    if (duration > 1_000) {
      logger.warn(
        { duration, rows: result.rowCount, query: text.slice(0, 120) },
        '[db.client] ⚠ Slow query phát hiện'
      );
    } else {
      logger.debug(
        { duration, rows: result.rowCount },
        '[db.client] Query thực thi thành công'
      );
    }

    return {
      rows:     result.rows,
      rowCount: result.rowCount ?? 0,
      command:  result.command,
    };
  } catch (error) {
    const duration = Date.now() - start;
    const err = error as Error & { code?: string };

    logger.error(
      {
        err:      err.message,
        code:     err.code,
        duration,
        query:    text.slice(0, 200),
      },
      '[db.client] Lỗi thực thi SQL query'
    );

    throw error;
  }
}

// =============================================================================
// withTransaction() — Transaction an toàn
// =============================================================================

/**
 * Thực thi một callback trong một database transaction.
 * Tự động COMMIT khi callback hoàn thành, hoặc ROLLBACK nếu có lỗi.
 *
 * @param callback - Async function nhận PoolClient, thực thi các query bên trong
 * @returns        - Giá trị trả về từ callback
 *
 * @example
 * const newUser = await withTransaction(async (client) => {
 *   const { rows } = await client.query(
 *     'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *',
 *     [email, hash, name]
 *   );
 *   await client.query('INSERT INTO facebook_accounts ...', [...]);
 *   return rows[0];
 * });
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  const pool   = getPool();
  const client = await pool.connect();
  const start  = Date.now();

  try {
    await client.query('BEGIN');
    logger.debug('[db.client] Transaction BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');
    const duration = Date.now() - start;
    logger.debug({ duration }, '[db.client] Transaction COMMIT thành công');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    const err = error as Error;
    logger.error(
      { err: err.message },
      '[db.client] Transaction ROLLBACK do lỗi'
    );
    throw error;
  } finally {
    // Luôn trả client về pool dù thành công hay thất bại
    client.release();
  }
}

// =============================================================================
// testConnection() — Kiểm tra kết nối khi khởi động
// =============================================================================

/**
 * Kiểm tra kết nối đến PostgreSQL bằng cách thực thi câu SELECT đơn giản.
 * Nên gọi hàm này trong server startup để phát hiện lỗi kết nối sớm.
 *
 * @returns true nếu kết nối thành công, false nếu thất bại
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query<{ now: Date; version: string }>(
      "SELECT NOW() as now, version() as version"
    );
    const row = result.rows[0];

    logger.info(
      {
        timestamp: row?.now,
        // Chỉ lấy phần đầu version string để tránh log quá dài
        dbVersion: row?.version?.split(' ').slice(0, 2).join(' '),
        poolTotal: getPool().totalCount,
        poolIdle:  getPool().idleCount,
      },
      '[db.client] ✔ Kết nối PostgreSQL thành công'
    );
    return true;
  } catch (error) {
    const err = error as Error;
    logger.error(
      { err: err.message },
      '[db.client] ✘ Không thể kết nối PostgreSQL'
    );
    return false;
  }
}

// =============================================================================
// closePool() — Đóng pool (dùng cho graceful shutdown & testing)
// =============================================================================

/**
 * Đóng pool và giải phóng tất cả connection.
 * Tự động được gọi khi nhận tín hiệu SIGINT hoặc SIGTERM.
 */
export async function closePool(): Promise<void> {
  if (_pool === null) {
    return;
  }

  logger.info('[db.client] Đang đóng database connection pool...');

  try {
    await _pool.end();
    _pool = null;
    logger.info('[db.client] ✔ Database pool đã đóng an toàn.');
  } catch (error) {
    const err = error as Error;
    logger.error({ err: err.message }, '[db.client] Lỗi khi đóng database pool');
    throw error;
  }
}

// =============================================================================
// Graceful Shutdown Hooks
// =============================================================================

/**
 * Đăng ký hooks lắng nghe tín hiệu SIGINT và SIGTERM để đóng pool an toàn.
 * Nên gọi hàm này một lần trong server/index.ts khi khởi động.
 */
export function registerShutdownHooks(): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`[db.client] Nhận tín hiệu ${signal}, đang khởi động graceful shutdown...`);
    await closePool();
    // Không gọi process.exit() ở đây — để index.ts quyết định
  };

  process.once('SIGINT',  () => { void shutdown('SIGINT'); });
  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });

  logger.debug('[db.client] Đã đăng ký graceful shutdown hooks (SIGINT, SIGTERM)');
}

// =============================================================================
// Export Pool instance getter (dùng trong trường hợp cần raw pool client)
// =============================================================================
export { getPool };
