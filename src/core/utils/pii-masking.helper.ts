/**
 * ShopFlow - PII Phone Number Masking Helper
 * File: backend/src/core/utils/pii-masking.helper.ts
 *
 * Tiện ích che dấu thông tin cá nhân khách hàng (PII Data Masking)
 * bảo vệ quyền riêng tư và ngăn chặn rò rỉ dữ liệu đối với vai trò `staff`.
 */

import { maskPhoneNumber } from '../../utils/phone-regex.js';
import { PageRole } from '../../infrastructure/repositories/page-member.repository.js';

export interface OrderWithPhone {
  customerPhone?: string | null;
  shippingPhone?: string | null;
  customer_phone?: string | null;
  [key: string]: unknown;
}

export interface CustomerWithPhone {
  phone?: string | null;
  phone_number?: string | null;
  [key: string]: unknown;
}

/**
 * Che dấu số điện thoại trong bản ghi đơn hàng nếu vai trò người dùng là staff.
 */
export function sanitizeOrderForRole<T extends OrderWithPhone>(
  order: T,
  role?: PageRole | string
): T {
  if (role === 'staff') {
    const sanitized = { ...order };
    if (sanitized.customerPhone) {
      sanitized.customerPhone = maskPhoneNumber(sanitized.customerPhone);
    }
    if (sanitized.customer_phone) {
      sanitized.customer_phone = maskPhoneNumber(sanitized.customer_phone);
    }
    if (sanitized.shippingPhone) {
      sanitized.shippingPhone = maskPhoneNumber(sanitized.shippingPhone);
    }
    return sanitized;
  }
  return order;
}

/**
 * Che dấu danh sách đơn hàng cho vai trò staff.
 */
export function sanitizeOrdersForRole<T extends OrderWithPhone>(
  orders: T[],
  role?: PageRole | string
): T[] {
  if (role === 'staff') {
    return orders.map((order) => sanitizeOrderForRole(order, role));
  }
  return orders;
}

/**
 * Che dấu số điện thoại trong hồ sơ khách hàng CRM cho vai trò staff.
 */
export function sanitizeCustomerForRole<T extends CustomerWithPhone>(
  customer: T,
  role?: PageRole | string
): T {
  if (role === 'staff') {
    const sanitized = { ...customer };
    if (sanitized.phone) {
      sanitized.phone = maskPhoneNumber(sanitized.phone);
    }
    if (sanitized.phone_number) {
      sanitized.phone_number = maskPhoneNumber(sanitized.phone_number);
    }
    return sanitized;
  }
  return customer;
}

/**
 * Che dấu danh sách khách hàng CRM cho vai trò staff.
 */
export function sanitizeCustomersForRole<T extends CustomerWithPhone>(
  customers: T[],
  role?: PageRole | string
): T[] {
  if (role === 'staff') {
    return customers.map((c) => sanitizeCustomerForRole(c, role));
  }
  return customers;
}
