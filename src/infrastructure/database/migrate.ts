/**
 * ShopFlow - Database Migration Runner
 * File: backend/src/infrastructure/database/migrate.ts
 *
 * Mục đích: Đọc và thực thi các tệp SQL migration theo thứ tự số thứ tự.
 * Sử dụng: npm run db:migrate
 *
 * Tính năng:
 *   - Quét thư mục migrations/ và sắp xếp theo thứ tự tên file (001_, 002_, ...)
 *   - Tự tạo bảng `_schema_migrations` để theo dõi các migration đã chạy (idempotent)
 *   - Không chạy lại migration đã thực thi thành công (skip nếu đã có record)
 *   - Toàn bộ mỗi migration chạy trong một Transaction - rollback ngay khi lỗi
 *   - Ghi log chi tiết với timestamp và tên file
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load environment variables từ backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to current working dir .env

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// =============================================================================
// Khởi tạo pg.Pool từ biến môi trường
// =============================================================================
function createPool(): Pool {
  const databaseUrl = process.env['DATABASE_URL'];

  if (!databaseUrl) {
    throw new Error(
      '[migrate] Biến môi trường DATABASE_URL chưa được thiết lập.\n' +
      '  Hãy chạy: cp backend/.env.example backend/.env và điền thông tin kết nối.'
    );
  }

  return new Pool({
    connectionString: databaseUrl,
    max: 3,                      // Migration chỉ cần ít connection
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
}

// =============================================================================
// Tạo bảng tracking migrations (idempotent)
// =============================================================================
async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id          SERIAL          PRIMARY KEY,
      filename    VARCHAR(255)    NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checksum    VARCHAR(64)     NOT NULL  -- SHA-256 của file SQL (phát hiện thay đổi)
    );

    COMMENT ON TABLE _schema_migrations IS
      'Bảng theo dõi các migration SQL đã được thực thi thành công';
  `);
}

// =============================================================================
// Lấy danh sách migration đã chạy
// =============================================================================
async function getAppliedMigrations(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ filename: string }>(
    'SELECT filename FROM _schema_migrations ORDER BY filename ASC'
  );
  return new Set(result.rows.map((r) => r.filename));
}

// =============================================================================
// Tính checksum đơn giản (dùng độ dài + hash ký tự đầu/cuối)
// (Dùng crypto module để tính SHA-256)
// =============================================================================
async function computeChecksum(content: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

// =============================================================================
// Thực thi một migration file trong Transaction
// =============================================================================
async function runMigration(
  client: PoolClient,
  filename: string,
  sqlContent: string,
  checksum: string
): Promise<void> {
  console.log(`  → Thực thi migration: ${filename}`);

  try {
    await client.query('BEGIN');

    // Chạy toàn bộ nội dung SQL
    await client.query(sqlContent);

    // Ghi nhận migration đã thực thi
    await client.query(
      `INSERT INTO _schema_migrations (filename, checksum)
       VALUES ($1, $2)
       ON CONFLICT (filename) DO NOTHING`,
      [filename, checksum]
    );

    await client.query('COMMIT');
    console.log(`  ✔ Hoàn thành: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(
      `[migrate] Lỗi khi thực thi migration "${filename}":\n${(error as Error).message}`
    );
  }
}

// =============================================================================
// Hàm chính: chạy toàn bộ migration pipeline
// =============================================================================
async function runMigrations(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       ShopFlow - Database Migration Runner       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`[migrate] Thư mục migration: ${MIGRATIONS_DIR}`);

  // --- Kiểm tra thư mục migrations tồn tại ---
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`[migrate] ERROR: Thư mục "${MIGRATIONS_DIR}" không tồn tại!`);
    process.exit(1);
  }

  // --- Quét tất cả file .sql và sắp xếp theo tên ---
  const sqlFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // Sắp xếp lexicographic: 001_ < 002_ < 003_

  if (sqlFiles.length === 0) {
    console.log('[migrate] Không tìm thấy tệp SQL nào trong thư mục migrations/. Kết thúc.');
    return;
  }

  console.log(`[migrate] Phát hiện ${sqlFiles.length} tệp SQL:`);
  sqlFiles.forEach((f) => console.log(`           • ${f}`));
  console.log('');

  // --- Kết nối database ---
  const pool = createPool();
  const client = await pool.connect();

  try {
    // Tạo bảng tracking nếu chưa có
    await ensureMigrationsTable(client);

    // Lấy danh sách migration đã chạy
    const applied = await getAppliedMigrations(client);
    console.log(`[migrate] Số migration đã áp dụng trước đó: ${applied.size}`);
    console.log('');

    let skipped = 0;
    let executed = 0;

    for (const filename of sqlFiles) {
      if (applied.has(filename)) {
        console.log(`  ↷ Bỏ qua (đã chạy): ${filename}`);
        skipped++;
        continue;
      }

      const filePath  = path.join(MIGRATIONS_DIR, filename);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      const checksum  = await computeChecksum(sqlContent);

      await runMigration(client, filename, sqlContent, checksum);
      executed++;
    }

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║             Kết Quả Migration                   ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Đã thực thi mới : ${String(executed).padEnd(27)}║`);
    console.log(`║  Đã bỏ qua       : ${String(skipped).padEnd(27)}║`);
    console.log(`║  Tổng cộng       : ${String(sqlFiles.length).padEnd(27)}║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    if (executed > 0) {
      console.log('[migrate] ✔ Migration hoàn thành thành công!');
    } else {
      console.log('[migrate] ✔ Không có migration mới cần chạy. Schema đã cập nhật.');
    }
  } finally {
    client.release();
    await pool.end();
    console.log('[migrate] Đã đóng kết nối database pool.');
    console.log('');
  }
}

// =============================================================================
// Entry point
// =============================================================================
runMigrations().catch((error: unknown) => {
  console.error('');
  console.error('[migrate] ✘ Migration thất bại!');
  console.error((error as Error).message);
  console.error('');
  process.exit(1);
});
