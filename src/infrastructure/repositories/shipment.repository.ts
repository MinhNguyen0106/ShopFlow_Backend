/**
 * ShopFlow - Shipment Repository (PostgreSQL / db.client)
 * File: backend/src/infrastructure/repositories/shipment.repository.ts
 */

import { query } from '../database/db.client.js';
import { Shipment } from '../../core/entities/order.entity.js';

export interface CreateShipmentInput {
  orderId: string;
  carrier: string;
  trackingCode: string;
  codAmount?: number;
  shippingFee?: number;
  weightGram?: number;
  status?: string;
  labelUrl?: string | null;
  estimatedDeliveryAt?: Date | string | null;
  rawResponse?: Record<string, unknown>;
}

export class ShipmentRepository {
  /**
   * Tạo bản ghi vận đơn mới
   */
  async create(data: CreateShipmentInput): Promise<Shipment> {
    const sql = `
      INSERT INTO shipments (
        order_id, carrier, tracking_code, cod_amount, shipping_fee,
        weight_gram, status, label_url, estimated_delivery_at, raw_response
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const params = [
      data.orderId,
      data.carrier,
      data.trackingCode.trim(),
      data.codAmount ?? 0,
      data.shippingFee ?? 0,
      data.weightGram ?? 500,
      data.status || 'ready_to_pick',
      data.labelUrl ?? null,
      data.estimatedDeliveryAt ? new Date(data.estimatedDeliveryAt) : null,
      JSON.stringify(data.rawResponse || {}),
    ];

    const res = await query(sql, params);
    return this.mapShipmentRow(res.rows[0]);
  }

  /**
   * Tra cứu vận đơn theo trackingCode
   */
  async findByTrackingCode(trackingCode: string): Promise<Shipment | null> {
    const sql = `
      SELECT * FROM shipments
      WHERE tracking_code = $1
      LIMIT 1;
    `;
    const res = await query(sql, [trackingCode.trim()]);
    const firstRow = res.rows[0];
    if (!firstRow) return null;
    return this.mapShipmentRow(firstRow);
  }

  /**
   * Tra cứu danh sách vận đơn theo orderId
   */
  async findByOrderId(orderId: string): Promise<Shipment[]> {
    const sql = `
      SELECT * FROM shipments
      WHERE order_id = $1
      ORDER BY created_at DESC;
    `;
    const res = await query(sql, [orderId]);
    return res.rows.map((row) => this.mapShipmentRow(row));
  }

  /**
   * Cập nhật trạng thái vận đơn
   */
  async updateStatus(id: string, status: string): Promise<Shipment> {
    const sql = `
      UPDATE shipments
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const res = await query(sql, [status, id]);
    return this.mapShipmentRow(res.rows[0]);
  }

  private mapShipmentRow(row: any): Shipment {
    let rawResponse: Record<string, unknown> = {};
    try {
      rawResponse = typeof row.raw_response === 'string' ? JSON.parse(row.raw_response) : row.raw_response || {};
    } catch {
      rawResponse = {};
    }

    return {
      id: row.id,
      orderId: row.order_id,
      carrier: row.carrier,
      trackingCode: row.tracking_code,
      codAmount: parseFloat(row.cod_amount),
      shippingFee: parseFloat(row.shipping_fee),
      weightGram: parseInt(row.weight_gram, 10),
      status: row.status,
      labelUrl: row.label_url,
      estimatedDeliveryAt: row.estimated_delivery_at
        ? new Date(row.estimated_delivery_at).toISOString()
        : null,
      rawResponse,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }
}
