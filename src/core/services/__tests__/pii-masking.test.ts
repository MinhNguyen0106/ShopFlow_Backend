/**
 * ShopFlow - Unit Tests: PII Phone Number Masking Helper
 * File: backend/src/core/services/__tests__/pii-masking.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeOrderForRole,
  sanitizeOrdersForRole,
  sanitizeCustomerForRole,
  sanitizeCustomersForRole,
} from '../../utils/pii-masking.helper.js';

describe('PII Phone Number Masking Helper', () => {
  const sampleOrder = {
    id: 'ord-123',
    orderCode: 'ORD-2026-001',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0981234567',
    customer_phone: '0981234567',
    shippingPhone: '0912345678',
    totalAmount: 500000,
  };

  const sampleCustomer = {
    id: 'cust-123',
    customer_name: 'Trần Thị B',
    phone: '0901234567',
    phone_number: '0901234567',
  };

  describe('sanitizeOrderForRole', () => {
    it('che mờ số điện thoại khi vai trò là staff', () => {
      const sanitized = sanitizeOrderForRole(sampleOrder, 'staff');

      expect(sanitized.customerPhone).toBe('098****567');
      expect(sanitized.customer_phone).toBe('098****567');
      expect(sanitized.shippingPhone).toBe('091****678');
      expect(sanitized.customerName).toBe('Nguyễn Văn A');
      expect(sanitized.totalAmount).toBe(500000);
    });

    it('giữ nguyên số điện thoại khi vai trò là owner', () => {
      const sanitized = sanitizeOrderForRole(sampleOrder, 'owner');

      expect(sanitized.customerPhone).toBe('0981234567');
      expect(sanitized.customer_phone).toBe('0981234567');
      expect(sanitized.shippingPhone).toBe('0912345678');
    });

    it('giữ nguyên số điện thoại khi vai trò là manager', () => {
      const sanitized = sanitizeOrderForRole(sampleOrder, 'manager');

      expect(sanitized.customerPhone).toBe('0981234567');
      expect(sanitized.customer_phone).toBe('0981234567');
      expect(sanitized.shippingPhone).toBe('0912345678');
    });

    it('xử lý an toàn khi trường số điện thoại là null hoặc undefined', () => {
      const emptyPhoneOrder = {
        id: 'ord-empty',
        customerPhone: null,
        shippingPhone: undefined,
      };

      const sanitized = sanitizeOrderForRole(emptyPhoneOrder, 'staff');
      expect(sanitized.customerPhone).toBeNull();
      expect(sanitized.shippingPhone).toBeUndefined();
    });
  });

  describe('sanitizeOrdersForRole', () => {
    it('che mờ danh sách đơn hàng cho vai trò staff', () => {
      const list = [sampleOrder, { ...sampleOrder, id: 'ord-124', customerPhone: '0979888999' }];
      const sanitized = sanitizeOrdersForRole(list, 'staff');

      expect(sanitized).toHaveLength(2);
      expect(sanitized[0]?.customerPhone).toBe('098****567');
      expect(sanitized[1]?.customerPhone).toBe('097****999');
    });

    it('không che mờ danh sách đơn hàng cho vai trò owner', () => {
      const list = [sampleOrder];
      const sanitized = sanitizeOrdersForRole(list, 'owner');

      expect(sanitized[0]?.customerPhone).toBe('0981234567');
    });
  });

  describe('sanitizeCustomerForRole & sanitizeCustomersForRole', () => {
    it('che mờ số điện thoại khách hàng cho vai trò staff', () => {
      const sanitized = sanitizeCustomerForRole(sampleCustomer, 'staff');

      expect(sanitized.phone).toBe('090****567');
      expect(sanitized.phone_number).toBe('090****567');
    });

    it('giữ nguyên số điện thoại khách hàng cho vai trò manager', () => {
      const sanitized = sanitizeCustomerForRole(sampleCustomer, 'manager');

      expect(sanitized.phone).toBe('0901234567');
      expect(sanitized.phone_number).toBe('0901234567');
    });

    it('che mờ danh sách khách hàng cho vai trò staff', () => {
      const sanitizedList = sanitizeCustomersForRole([sampleCustomer], 'staff');

      expect(sanitizedList[0]?.phone).toBe('090****567');
    });
  });
});
