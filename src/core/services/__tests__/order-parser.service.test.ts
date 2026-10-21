/**
 * ShopFlow - Hybrid Order Parser Service Unit Tests (TASK-20)
 * File: backend/src/core/services/__tests__/order-parser.service.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { OrderParserService } from '../order-parser.service.js';
import { RegexOrderParser } from '../regex-order-parser.js';
import { GeminiClient } from '../../../infrastructure/ai/gemini.client.js';

describe('OrderParserService (Hybrid Architecture)', () => {
  it('chọn Tầng 1 (Regex Fast-path) khi bình luận rõ ràng và confidence >= 0.8 mà không cần gọi AI', async () => {
    const mockRegex = new RegexOrderParser();
    const mockAiClient = {
      extractOrderEntity: vi.fn(),
    } as unknown as GeminiClient;

    const service = new OrderParserService({
      regexParser: mockRegex,
      aiClient: mockAiClient,
    });

    const input = {
      text: '#SP001 2 cái đỏ size M 0987654321 địa chỉ 123 Cầu Giấy, Hà Nội',
    };

    const result = await service.parseOrder(input);

    expect(result.extractionMethod).toBe('regex');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.8);
    expect(result.customerPhone).toBe('0987654321');
    expect(mockAiClient.extractOrderEntity).not.toHaveBeenCalled();
  });

  it('chọn Tầng 2 (Gemini AI Fallback) khi cú pháp tự nhiên tự do không khớp Regex hoàn chỉnh', async () => {
    const mockRegex = {
      parse: vi.fn().mockReturnValue({
        items: [{ productCode: null, productName: null, quantity: 1, attributes: {} }],
        customerName: null,
        customerPhone: null,
        shippingAddress: null,
        confidenceScore: 0.3,
        rawInput: 'Shop ơi gửi mình 1 đầm maxi màu hồng phấn size vừa nha',
        extractionMethod: 'regex',
        notes: null,
      }),
    } as unknown as RegexOrderParser;

    const mockAiClient = {
      extractOrderEntity: vi.fn().mockResolvedValue({
        items: [
          {
            productCode: 'DAM_MAXI',
            productName: 'Đầm maxi',
            quantity: 1,
            attributes: { color: 'hồng phấn', size: 'M' },
            priceEstimate: 450000,
          },
        ],
        customerName: 'Hoàng Yến',
        customerPhone: '0912345678',
        shippingAddress: 'Tòa Landmark 81, Bình Thạnh, HCM',
        confidenceScore: 0.9,
        rawInput: 'Shop ơi gửi mình 1 đầm maxi màu hồng phấn size vừa nha',
        extractionMethod: 'ai_gemini',
        notes: null,
      }),
    } as unknown as GeminiClient;

    const service = new OrderParserService({
      regexParser: mockRegex,
      aiClient: mockAiClient,
    });

    const input = {
      text: 'Shop ơi gửi mình 1 đầm maxi màu hồng phấn size vừa nha',
      context: { customerName: 'Hoàng Yến', defaultProductCode: 'DAM_MAXI' },
    };

    const result = await service.parseOrder(input);

    expect(mockRegex.parse).toHaveBeenCalledTimes(1);
    expect(mockAiClient.extractOrderEntity).toHaveBeenCalledTimes(1);
    expect(result.extractionMethod).toBe('ai_gemini');
    expect(result.items[0]!.productCode).toBe('DAM_MAXI');
    expect(result.items[0]!.attributes.color).toBe('hồng phấn');
    expect(result.confidenceScore).toBe(0.9);
  });

  it('tự động giáng cấp (graceful degradation) về regex_fallback khi Gemini AI gặp lỗi sự cố', async () => {
    const mockRegex = {
      parse: vi.fn().mockReturnValue({
        items: [{ productCode: 'AO_KHOAC', productName: null, quantity: 1, attributes: {} }],
        customerName: null,
        customerPhone: null,
        shippingAddress: null,
        confidenceScore: 0.65,
        rawInput: 'áo khoác size L ship tỉnh nhé',
        extractionMethod: 'regex',
        notes: null,
      }),
    } as unknown as RegexOrderParser;

    const mockAiClient = {
      extractOrderEntity: vi.fn().mockRejectedValue(new Error('Quota limit exceeded')),
    } as unknown as GeminiClient;

    const service = new OrderParserService({
      regexParser: mockRegex,
      aiClient: mockAiClient,
    });

    const result = await service.parseOrder({ text: 'áo khoác size L ship tỉnh nhé' });

    expect(result.extractionMethod).toBe('regex_fallback');
    expect(result.notes).toContain('Gemini AI unavailable');
    expect(result.items[0]!.productCode).toBe('AO_KHOAC');
  });
});
