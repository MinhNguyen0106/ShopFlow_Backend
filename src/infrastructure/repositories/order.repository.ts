/**
 * ShopFlow - Order Repository (PostgreSQL / db.client)
 * File: backend/src/infrastructure/repositories/order.repository.ts
 */

import { query, withTransaction } from '../database/db.client.js';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  OrderTimelineEvent,
} from '../../core/entities/order.entity.js';
import { AppError } from '../../core/errors/app-error.js';

export interface CreateOrderInput {
  pageId: string;
  customerId: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  totalAmount: number;
  shippingFee?: number;
  discountAmount?: number;
  finalAmount: number;
  paymentMethod?: 'cod' | 'vietqr' | 'bank_transfer';
  source?: 'facebook_comment' | 'facebook_inbox' | 'manual';
  sourceMetaId?: string | null;
  notes?: string | null;
  items: Array<{
    productId?: string | null;
    sku: string;
    productName: string;
    quantity: number;
    price: number;
    variant?: Record<string, unknown>;
    imageUrl?: string | null;
  }>;
}

export class OrderRepository {
  /**
   * Tạo đơn hàng mới cùng danh sách sản phẩm trong một Transaction an toàn
   */
  async create(data: CreateOrderInput): Promise<Order> {
    return withTransaction(async (client) => {
      const initialTimeline: OrderTimelineEvent[] = [
        {
          status: 'pending',
          note: 'Tạo đơn hàng mới',
          timestamp: new Date().toISOString(),
          actor: 'system',
        },
      ];

      const orderSql = `
        INSERT INTO orders (
          page_id, customer_id, order_code, customer_name, customer_phone,
          shipping_address, total_amount, shipping_fee, discount_amount, final_amount,
          payment_method, source, source_meta_id, notes, timeline
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
      `;

      const orderParams = [
        data.pageId,
        data.customerId,
        data.orderCode.trim().toUpperCase(),
        data.customerName.trim(),
        data.customerPhone ?? null,
        data.shippingAddress ?? null,
        data.totalAmount,
        data.shippingFee ?? 0,
        data.discountAmount ?? 0,
        data.finalAmount,
        data.paymentMethod ?? 'cod',
        data.source ?? 'facebook_comment',
        data.sourceMetaId ?? null,
        data.notes ?? null,
        JSON.stringify(initialTimeline),
      ];

      const orderRes = await client.query(orderSql, orderParams);
      const orderRow = orderRes.rows[0];

      const insertedItems: OrderItem[] = [];

      for (const item of data.items) {
        const itemSql = `
          INSERT INTO order_items (
            order_id, product_id, sku, product_name, quantity, price, variant, image_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;
        const itemParams = [
          orderRow.id,
          item.productId ?? null,
          item.sku.trim().toUpperCase(),
          item.productName.trim(),
          item.quantity,
          item.price,
          JSON.stringify(item.variant || {}),
          item.imageUrl ?? null,
        ];
        const itemRes = await client.query(itemSql, itemParams);
        insertedItems.push(this.mapItemRow(itemRes.rows[0]));
      }

      return this.mapOrderRow(orderRow, insertedItems);
    });
  }

  /**
   * Tìm đơn hàng theo ID kèm danh sách items
   */
  async findById(id: string): Promise<Order | null> {
    const orderSql = 'SELECT * FROM orders WHERE id = $1 LIMIT 1;';
    const orderRes = await query(orderSql, [id]);
    const firstRow = orderRes.rows[0];
    if (!firstRow) return null;

    const itemsSql = 'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC;';
    const itemsRes = await query(itemsSql, [id]);
    const items = itemsRes.rows.map((row) => this.mapItemRow(row));

    return this.mapOrderRow(firstRow, items);
  }

  /**
   * Tìm đơn hàng theo mã orderCode (ví dụ: 'ORD-2026-001')
   */
  async findByOrderCode(orderCode: string, pageId?: string): Promise<Order | null> {
    const cleanCode = orderCode.trim().toUpperCase();
    let sql = 'SELECT * FROM orders WHERE order_code = $1';
    const params: unknown[] = [cleanCode];

    if (pageId) {
      sql += ' AND page_id = $2';
      params.push(pageId);
    }
    sql += ' LIMIT 1;';

    const orderRes = await query(sql, params);
    const firstRow = orderRes.rows[0];
    if (!firstRow) return null;

    const itemsSql = 'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC;';
    const itemsRes = await query(itemsSql, [firstRow.id]);
    const items = itemsRes.rows.map((row) => this.mapItemRow(row));

    return this.mapOrderRow(firstRow, items);
  }

  /**
   * Lấy danh sách đơn hàng theo Fanpage có lọc trạng thái, tìm kiếm, phân trang
   */
  async findMany(params: {
    pageId: string;
    status?: OrderStatus | 'all';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number; page: number; limit: number; totalPages: number }> {
    const { pageId, status, search, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['page_id = $1'];
    const values: unknown[] = [pageId];
    let paramIdx = 2;

    if (status && status !== 'all') {
      conditions.push(`status = $${paramIdx++}`);
      values.push(status);
    }

    if (search && search.trim().length > 0) {
      const searchKeyword = `%${search.trim()}%`;
      conditions.push(
        `(order_code ILIKE $${paramIdx} OR customer_name ILIKE $${paramIdx} OR customer_phone ILIKE $${paramIdx})`
      );
      values.push(searchKeyword);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `SELECT COUNT(*) AS total FROM orders WHERE ${whereClause};`;
    const countRes = await query(countSql, values);
    const total = parseInt((countRes.rows[0] as { total: string | number }).total.toString(), 10) || 0;

    const listSql = `
      SELECT * FROM orders
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;
    const listRes = await query(listSql, [...values, limit, offset]);

    const orders = listRes.rows.map((row) => this.mapOrderRow(row, []));

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Cập nhật trạng thái đơn hàng và ghi vào timeline audit
   */
  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    note?: string,
    actor: string = 'system'
  ): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng cần cập nhật', 404, 'ORDER_NOT_FOUND');
    }

    const newTimelineItem: OrderTimelineEvent = {
      status: newStatus,
      note: note || `Chuyển trạng thái sang ${newStatus}`,
      actor,
      timestamp: new Date().toISOString(),
    };

    const updatedTimeline = [...order.timeline, newTimelineItem];

    const sql = `
      UPDATE orders
      SET status = $1, timeline = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const res = await query(sql, [newStatus, JSON.stringify(updatedTimeline), id]);
    return this.mapOrderRow(res.rows[0], order.items || []);
  }

  /**
   * Cập nhật trạng thái thanh toán
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    paymentMethod?: 'cod' | 'vietqr' | 'bank_transfer'
  ): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404, 'ORDER_NOT_FOUND');
    }

    let sql = 'UPDATE orders SET payment_status = $1';
    const params: unknown[] = [paymentStatus];
    let idx = 2;

    if (paymentMethod) {
      sql += `, payment_method = $${idx++}`;
      params.push(paymentMethod);
    }

    sql += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx++} RETURNING *;`;
    params.push(id);

    const res = await query(sql, params);
    return this.mapOrderRow(res.rows[0], order.items || []);
  }

  private mapOrderRow(row: any, items: OrderItem[] = []): Order {
    let timeline: OrderTimelineEvent[] = [];
    try {
      timeline = typeof row.timeline === 'string' ? JSON.parse(row.timeline) : row.timeline || [];
    } catch {
      timeline = [];
    }

    return {
      id: row.id,
      pageId: row.page_id,
      customerId: row.customer_id,
      orderCode: row.order_code,
      status: row.status as OrderStatus,
      paymentStatus: row.payment_status as PaymentStatus,
      paymentMethod: row.payment_method,
      source: row.source,
      sourceMetaId: row.source_meta_id,
      totalAmount: parseFloat(row.total_amount),
      shippingFee: parseFloat(row.shipping_fee),
      discountAmount: parseFloat(row.discount_amount),
      finalAmount: parseFloat(row.final_amount),
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      shippingAddress: row.shipping_address,
      notes: row.notes,
      timeline,
      items,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  private mapItemRow(row: any): OrderItem {
    let variant: Record<string, unknown> = {};
    try {
      variant = typeof row.variant === 'string' ? JSON.parse(row.variant) : row.variant || {};
    } catch {
      variant = {};
    }

    return {
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      sku: row.sku,
      productName: row.product_name,
      quantity: parseInt(row.quantity, 10),
      price: parseFloat(row.price),
      variant,
      imageUrl: row.image_url,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }
}
