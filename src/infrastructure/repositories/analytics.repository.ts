/**
 * ShopFlow - Analytics Repository (PostgreSQL / db.client)
 * File: backend/src/infrastructure/repositories/analytics.repository.ts
 *
 * Thực hiện các câu truy vấn tổng hợp hiệu năng cao phục vụ phân hệ Báo Cáo Phân Tích.
 */

import { query } from '../database/db.client.js';

export interface RawPeriodMetrics {
  total_revenue: string | number;
  total_orders: string | number;
  completed_orders: string | number;
  cancelled_orders: string | number;
  average_order_value: string | number;
  total_customers: string | number;
}

export interface RawRevenueSeriesRow {
  series_date: string;
  revenue: string | number;
  orders_count: string | number;
  vietqr_revenue: string | number;
  cod_revenue: string | number;
}

export interface RawChannelRow {
  source: string;
  orders_count: string | number;
  revenue: string | number;
  success_orders: string | number;
  cancelled_orders: string | number;
}

export interface RawTopProductRow {
  product_id: string | null;
  sku: string;
  product_name: string;
  image_url: string | null;
  total_quantity: string | number;
  total_revenue: string | number;
}

export interface RawHeatmapRow {
  day_of_week: string | number;
  hour_of_day: string | number;
  order_count: string | number;
  total_amount: string | number;
}

export class AnalyticsRepository {
  /**
   * Truy vấn tổng hợp các chỉ số KPIs kinh doanh trong một khoảng thời gian
   */
  async getPeriodMetrics(
    pageId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RawPeriodMetrics> {
    const conditions: string[] = ["status NOT IN ('cancelled')"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (pageId) {
      conditions.push(`page_id = $${paramIdx++}`);
      params.push(pageId);
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        COALESCE(SUM(final_amount), 0) AS total_revenue,
        COUNT(id) AS total_orders,
        COUNT(id) FILTER (WHERE status = 'completed') AS completed_orders,
        COUNT(id) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
        COALESCE(AVG(final_amount), 0) AS average_order_value,
        COUNT(DISTINCT customer_id) AS total_customers
      FROM orders
      ${whereClause};
    `;

    const result = await query(sql, params);
    const row = result.rows[0] as RawPeriodMetrics | undefined;

    return (
      row || {
        total_revenue: 0,
        total_orders: 0,
        completed_orders: 0,
        cancelled_orders: 0,
        average_order_value: 0,
        total_customers: 0,
      }
    );
  }

  /**
   * Truy vấn chuỗi thời gian doanh thu và đơn hàng theo từng ngày
   */
  async getDailyRevenueSeries(
    pageId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RawRevenueSeriesRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (pageId) {
      conditions.push(`page_id = $${paramIdx++}`);
      params.push(pageId);
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS series_date,
        COALESCE(SUM(final_amount) FILTER (WHERE status NOT IN ('cancelled')), 0) AS revenue,
        COUNT(id) FILTER (WHERE status NOT IN ('cancelled')) AS orders_count,
        COALESCE(SUM(final_amount) FILTER (WHERE payment_method = 'vietqr' AND status NOT IN ('cancelled')), 0) AS vietqr_revenue,
        COALESCE(SUM(final_amount) FILTER (WHERE payment_method = 'cod' AND status NOT IN ('cancelled')), 0) AS cod_revenue
      FROM orders
      ${whereClause}
      GROUP BY series_date
      ORDER BY series_date ASC;
    `;

    const result = await query(sql, params);
    return result.rows as RawRevenueSeriesRow[];
  }

  /**
   * Phân tích hiệu quả chuyển đổi theo kênh nguồn (Comment vs Inbox vs Manual)
   */
  async getChannelBreakdown(
    pageId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RawChannelRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (pageId) {
      conditions.push(`page_id = $${paramIdx++}`);
      params.push(pageId);
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        source,
        COUNT(id) AS orders_count,
        COALESCE(SUM(final_amount) FILTER (WHERE status NOT IN ('cancelled')), 0) AS revenue,
        COUNT(id) FILTER (WHERE status IN ('confirmed', 'shipping', 'completed')) AS success_orders,
        COUNT(id) FILTER (WHERE status = 'cancelled') AS cancelled_orders
      FROM orders
      ${whereClause}
      GROUP BY source
      ORDER BY revenue DESC;
    `;

    const result = await query(sql, params);
    return result.rows as RawChannelRow[];
  }

  /**
   * Truy vấn Top sản phẩm bán chạy nhất theo doanh thu
   */
  async getTopSellingProducts(
    pageId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 10
  ): Promise<RawTopProductRow[]> {
    const conditions: string[] = ["o.status NOT IN ('cancelled')"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (pageId) {
      conditions.push(`o.page_id = $${paramIdx++}`);
      params.push(pageId);
    }
    if (startDate) {
      conditions.push(`o.created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`o.created_at <= $${paramIdx++}`);
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    params.push(limit);
    const limitParam = `$${paramIdx++}`;

    const sql = `
      SELECT
        oi.product_id,
        oi.sku,
        oi.product_name,
        COALESCE(oi.image_url, p.image_urls->>0) AS image_url,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        COALESCE(SUM(oi.price * oi.quantity), 0) AS total_revenue
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      ${whereClause}
      GROUP BY oi.product_id, oi.sku, oi.product_name, oi.image_url, p.image_urls
      ORDER BY total_revenue DESC, total_quantity DESC
      LIMIT ${limitParam};
    `;

    const result = await query(sql, params);
    return result.rows as RawTopProductRow[];
  }

  /**
   * Truy vấn ma trận nhiệt chốt đơn (24h x 7 ngày trong tuần)
   */
  async getSalesHeatmap(
    pageId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RawHeatmapRow[]> {
    const conditions: string[] = ["status NOT IN ('cancelled')"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (pageId) {
      conditions.push(`page_id = $${paramIdx++}`);
      params.push(pageId);
    }
    if (startDate) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT AS day_of_week,
        EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT AS hour_of_day,
        COUNT(id) AS order_count,
        COALESCE(SUM(final_amount), 0) AS total_amount
      FROM orders
      ${whereClause}
      GROUP BY day_of_week, hour_of_day
      ORDER BY day_of_week ASC, hour_of_day ASC;
    `;

    const result = await query(sql, params);
    return result.rows as RawHeatmapRow[];
  }
}
