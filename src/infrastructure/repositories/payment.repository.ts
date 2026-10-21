/**
 * ShopFlow - Payment Repository (PostgreSQL / db.client)
 * File: backend/src/infrastructure/repositories/payment.repository.ts
 */

import { query } from '../database/db.client.js';
import { Payment } from '../../core/entities/order.entity.js';

export interface CreatePaymentInput {
  orderId: string;
  transactionId: string;
  gateway?: string;
  amount: number;
  transferContent?: string | null;
  bankAccount?: string | null;
  bankCode?: string | null;
  status?: 'success' | 'partially_paid' | 'refunded' | 'failed';
  paidAt?: Date | string;
  rawPayload?: Record<string, unknown>;
}

export class PaymentRepository {
  /**
   * Tạo bản ghi thanh toán mới
   */
  async create(data: CreatePaymentInput): Promise<Payment> {
    const sql = `
      INSERT INTO payments (
        order_id, transaction_id, gateway, amount, transfer_content,
        bank_account, bank_code, status, paid_at, raw_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const params = [
      data.orderId,
      data.transactionId.trim(),
      data.gateway || 'vietqr',
      data.amount,
      data.transferContent ?? null,
      data.bankAccount ?? null,
      data.bankCode ?? null,
      data.status || 'success',
      data.paidAt ? new Date(data.paidAt) : new Date(),
      JSON.stringify(data.rawPayload || {}),
    ];

    const res = await query(sql, params);
    return this.mapPaymentRow(res.rows[0]);
  }

  /**
   * Tìm giao dịch thanh toán theo mã transaction_id và gateway (Idempotency)
   */
  async findByTransactionId(transactionId: string, gateway: string = 'vietqr'): Promise<Payment | null> {
    const sql = `
      SELECT * FROM payments
      WHERE transaction_id = $1 AND gateway = $2
      LIMIT 1;
    `;
    const res = await query(sql, [transactionId.trim(), gateway]);
    const firstRow = res.rows[0];
    if (!firstRow) return null;
    return this.mapPaymentRow(firstRow);
  }

  /**
   * Tìm tất cả các giao dịch thanh toán của một đơn hàng
   */
  async findByOrderId(orderId: string): Promise<Payment[]> {
    const sql = `
      SELECT * FROM payments
      WHERE order_id = $1
      ORDER BY paid_at DESC;
    `;
    const res = await query(sql, [orderId]);
    return res.rows.map((row) => this.mapPaymentRow(row));
  }

  private mapPaymentRow(row: any): Payment {
    let rawPayload: Record<string, unknown> = {};
    try {
      rawPayload = typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload || {};
    } catch {
      rawPayload = {};
    }

    return {
      id: row.id,
      orderId: row.order_id,
      transactionId: row.transaction_id,
      gateway: row.gateway,
      amount: parseFloat(row.amount),
      transferContent: row.transfer_content,
      bankAccount: row.bank_account,
      bankCode: row.bank_code,
      status: row.status,
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : new Date().toISOString(),
      rawPayload,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }
}
