/**
 * ShopFlow - Order Parser Golden Test Fixtures & Integration Suite (TASK-20)
 * File: backend/tests/integration/order-parser.test.ts
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { orderParserService } from '../../src/core/services/order-parser.service.js';

interface TestCaseExpected {
  productCode?: string | null;
  quantity?: number;
  color?: string;
  size?: string;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  minConfidence?: number;
  maxConfidence?: number;
}

interface OrderTestCase {
  id: string;
  description: string;
  input: {
    text: string;
    context?: Record<string, unknown>;
  };
  expected: TestCaseExpected;
}

describe('OrderParserService Golden Fixtures Integration Suite', () => {
  const fixturesPath = path.resolve(__dirname, '../fixtures/order-parser-cases.json');
  const rawFixtures = fs.readFileSync(fixturesPath, 'utf-8');
  const testCases: OrderTestCase[] = JSON.parse(rawFixtures);

  it('phải có ít nhất 20 fixtures thực tế được nạp', () => {
    expect(testCases.length).toBeGreaterThanOrEqual(20);
  });

  let passedCases = 0;

  for (const testCase of testCases) {
    it(`[${testCase.id}] ${testCase.description}`, async () => {
      const result = await orderParserService.parseOrder(testCase.input);

      const exp = testCase.expected;

      // 1. Kiểm tra mã sản phẩm
      if (exp.productCode !== undefined) {
        expect(result.items[0]?.productCode).toBe(exp.productCode);
      }

      // 2. Kiểm tra số lượng
      if (exp.quantity !== undefined) {
        expect(result.items[0]?.quantity).toBe(exp.quantity);
      }

      // 3. Kiểm tra thuộc tính màu sắc
      if (exp.color !== undefined) {
        expect(result.items[0]?.attributes?.color).toBe(exp.color);
      }

      // 4. Kiểm tra thuộc tính size
      if (exp.size !== undefined) {
        expect(result.items[0]?.attributes?.size).toBe(exp.size);
      }

      // 5. Kiểm tra số điện thoại
      if (exp.customerPhone !== undefined) {
        expect(result.customerPhone).toBe(exp.customerPhone);
      }

      // 6. Kiểm tra địa chỉ giao hàng
      if (exp.shippingAddress !== undefined) {
        expect(result.shippingAddress).toBe(exp.shippingAddress);
      }

      // 7. Kiểm tra ngưỡng tin cậy
      if (exp.minConfidence !== undefined) {
        expect(result.confidenceScore).toBeGreaterThanOrEqual(exp.minConfidence);
      }
      if (exp.maxConfidence !== undefined) {
        expect(result.confidenceScore).toBeLessThanOrEqual(exp.maxConfidence);
      }

      passedCases++;
    });
  }

  it('đảm bảo tỷ lệ bóc tách chính xác trên bộ Golden Dataset đạt tối thiểu 95%', () => {
    const accuracy = (passedCases / testCases.length) * 100;
    expect(accuracy).toBeGreaterThanOrEqual(95);
  });
});
