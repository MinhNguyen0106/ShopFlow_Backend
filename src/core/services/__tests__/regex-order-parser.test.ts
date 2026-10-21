/**
 * ShopFlow - Regex Order Parser Unit Tests (TASK-20)
 * File: backend/src/core/services/__tests__/regex-order-parser.test.ts
 */

import { describe, it, expect } from 'vitest';
import { regexOrderParser } from '../regex-order-parser.js';

describe('RegexOrderParser', () => {
  const parser = regexOrderParser;

  it('trích xuất đầy đủ thông tin đơn hàng với cú pháp chuẩn shop online', () => {
    const input = '#VAY01 2 cái đỏ size L 0987654321 địa chỉ 123 Cầu Giấy, Hà Nội';
    const result = parser.parse(input, { customerName: 'Nguyễn Văn A' });

    expect(result.customerName).toBe('Nguyễn Văn A');
    expect(result.customerPhone).toBe('0987654321');
    expect(result.shippingAddress).toBe('123 Cầu Giấy, Hà Nội');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.8);
    expect(result.extractionMethod).toBe('regex');

    expect(result.items).toHaveLength(1);
    const item = result.items[0]!;
    expect(item.productCode).toBe('VAY01');
    expect(item.quantity).toBe(2);
    expect(item.attributes.color).toBe('đỏ');
    expect(item.attributes.size).toBe('L');
  });

  it('áp dụng defaultProductCode khi comment không chứa mã sản phẩm', () => {
    const input = 'Cho mình 1 chiếc màu đen size M về địa chỉ 45 Lê Lợi, Q1, HCM, sdt 0912345678';
    const result = parser.parse(input, { defaultProductCode: 'AOPOLO' });

    expect(result.items[0]!.productCode).toBe('AOPOLO');
    expect(result.customerPhone).toBe('0912345678');
    expect(result.items[0]!.quantity).toBe(1);
    expect(result.items[0]!.attributes.color).toBe('đen');
    expect(result.items[0]!.attributes.size).toBe('M');
  });

  it('xử lý chuỗi rỗng hoặc văn bản không có thông tin đơn hàng', () => {
    const result = parser.parse('');
    expect(result.customerPhone).toBeNull();
    expect(result.items[0]!.productCode).toBeNull();
    expect(result.shippingAddress).toBeNull();
    expect(result.confidenceScore).toBeLessThan(0.5);
  });

  it('xử lý các từ khóa chỉ định địa chỉ giao hàng phong phú', () => {
    const case1 = parser.parse('#SP99 ship về 12 Hai Bà Trưng, Hoàn Kiếm, HN 0901234567');
    expect(case1.shippingAddress).toBe('12 Hai Bà Trưng, Hoàn Kiếm, HN');

    const case2 = parser.parse('#SP99 gửi đến Số 8 ngõ 10 đường Láng, Đống Đa, HN lh 0901234567');
    expect(case2.shippingAddress).toBe('Số 8 ngõ 10 đường Láng, Đống Đa, HN');
  });

  it('đạt chuẩn hiệu năng thực thi cực nhanh < 50ms cho mỗi yêu cầu', () => {
    const input = '#DAMHOA 2 cái vàng size XL 0933123456 giao đến 78 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TPHCM';
    
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      parser.parse(input);
    }
    const totalDuration = performance.now() - startTime;
    const avgDuration = totalDuration / 100;

    expect(avgDuration).toBeLessThan(50);
  });
});
