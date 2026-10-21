/**
 * ShopFlow - Customers Repository
 * File: backend/src/infrastructure/repositories/customer.repository.ts
 *
 * Tương tác với bảng `customers` (CRM khách hàng).
 * Hỗ trợ upsert tự động gán nhãn `["Co_SDT"]` và lưu trữ số điện thoại an toàn.
 */

import { query } from '../database/db.client.js';

export interface Customer {
  id: string;
  page_id: string; // UUID tham chiếu connected_pages(id)
  customer_fb_id: string;
  customer_name: string | null;
  phone_number: string | null;
  address: string | null;
  tags: string[];
  notes: string | null;
  last_interaction_at: Date;
  created_at: Date;
}

export class CustomerRepository {
  /**
   * Tạo mới hoặc cập nhật thông tin khách hàng kèm số điện thoại và nhãn phân loại (tags).
   * Sử dụng PostgreSQL ON CONFLICT để đảm bảo tính Idempotent.
   *
   * @param pageInternalId  - UUID của Fanpage trong bảng connected_pages
   * @param customerFbId    - Facebook PSID/ASID của khách hàng
   * @param customerName    - Tên hiển thị Facebook của khách hàng
   * @param phoneNumber     - Số điện thoại đã được chuẩn hóa
   * @param tag             - Nhãn phân loại (mặc định 'Co_SDT')
   */
  async upsertWithPhone(
    pageInternalId: string,
    customerFbId: string,
    customerName: string | undefined,
    phoneNumber: string,
    tag: string = 'Co_SDT'
  ): Promise<Customer | null> {
    const sql = `
      INSERT INTO customers (page_id, customer_fb_id, customer_name, phone_number, tags, last_interaction_at)
      VALUES ($1, $2, $3, $4, jsonb_build_array($5::text), CURRENT_TIMESTAMP)
      ON CONFLICT (page_id, customer_fb_id) DO UPDATE
      SET
        phone_number = EXCLUDED.phone_number,
        customer_name = COALESCE(EXCLUDED.customer_name, customers.customer_name),
        tags = CASE
          WHEN customers.tags ? $5 THEN customers.tags
          ELSE customers.tags || jsonb_build_array($5::text)
        END,
        last_interaction_at = CURRENT_TIMESTAMP
      RETURNING id, page_id, customer_fb_id, customer_name, phone_number, tags, last_interaction_at, created_at
    `;

    const params = [
      pageInternalId,
      customerFbId,
      customerName ?? null,
      phoneNumber,
      tag,
    ];

    const result = await query<Customer>(sql, params);
    return result.rows[0] ?? null;
  }

  /**
   * Tìm khách hàng theo Facebook ID và Fanpage UUID.
   */
  async findByFbId(
    pageInternalId: string,
    customerFbId: string
  ): Promise<Customer | null> {
    const sql = `
      SELECT id, page_id, customer_fb_id, customer_name, phone_number, address, tags, notes, last_interaction_at, created_at
      FROM customers
      WHERE page_id = $1 AND customer_fb_id = $2
      LIMIT 1
    `;
    const result = await query<Customer>(sql, [pageInternalId, customerFbId]);
    return result.rows[0] ?? null;
  }

  /**
   * Tìm khách hàng theo Customer UUID.
   */
  async findById(customerId: string): Promise<Customer | null> {
    const sql = `
      SELECT id, page_id, customer_fb_id, customer_name, phone_number, address, tags, notes, last_interaction_at, created_at
      FROM customers
      WHERE id = $1
      LIMIT 1
    `;
    const result = await query<Customer>(sql, [customerId]);
    return result.rows[0] ?? null;
  }

  /**
   * Tìm khách hàng theo Customer UUID và kiểm tra quyền sở hữu của user qua connected_pages.
   */
  async findByIdAndUserId(
    customerId: string,
    userId: string
  ): Promise<Customer | null> {
    const sql = `
      SELECT cu.id, cu.page_id, cu.customer_fb_id, cu.customer_name, cu.phone_number, cu.address, cu.tags, cu.notes, cu.last_interaction_at, cu.created_at
      FROM customers cu
      JOIN connected_pages p ON cu.page_id = p.id
      WHERE cu.id = $1 AND p.user_id = $2
      LIMIT 1
    `;
    const result = await query<Customer>(sql, [customerId, userId]);
    return result.rows[0] ?? null;
  }

  /**
   * Cập nhật thông tin khách hàng (customer_name, phone_number, address, tags, notes).
   */
  async update(
    customerId: string,
    data: {
      customer_name?: string;
      phone_number?: string;
      address?: string;
      tags?: string[];
      notes?: string;
    }
  ): Promise<Customer | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.customer_name !== undefined) {
      fields.push(`customer_name = $${idx++}`);
      values.push(data.customer_name);
    }
    if (data.phone_number !== undefined) {
      fields.push(`phone_number = $${idx++}`);
      values.push(data.phone_number);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(data.address);
    }
    if (data.tags !== undefined) {
      fields.push(`tags = $${idx++}::jsonb`);
      values.push(JSON.stringify(data.tags));
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(data.notes);
    }

    if (fields.length === 0) {
      return this.findById(customerId);
    }

    values.push(customerId);
    const sql = `
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, page_id, customer_fb_id, customer_name, phone_number, address, tags, notes, last_interaction_at, created_at
    `;

    const result = await query<Customer>(sql, values);
    return result.rows[0] ?? null;
  }
}

export const customerRepository = new CustomerRepository();
