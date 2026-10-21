/**
 * ShopFlow - Gemini Client Unit Tests (TASK-20)
 * File: backend/src/infrastructure/ai/__tests__/gemini.client.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { GeminiClient, GeminiClientError } from '../gemini.client.js';

describe('GeminiClient', () => {
  it('không gọi network khi text đầu vào rỗng để tiết kiệm token', async () => {
    const mockFetch = vi.fn();
    const client = new GeminiClient({ apiKey: 'test-key', fetchFn: mockFetch });

    const result = await client.extractOrderEntity('', { customerName: 'Khách Lạ' });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.customerName).toBe('Khách Lạ');
    expect(result.confidenceScore).toBe(0.1);
    expect(result.extractionMethod).toBe('ai_gemini');
  });

  it('gọi Gemini API và trích xuất thành công thực thể đơn hàng tiếng Việt', async () => {
    const aiOutputJson = JSON.stringify({
      items: [
        {
          productCode: 'VAYHOA01',
          productName: 'Váy hoa nhí vintage',
          quantity: 2,
          attributes: { color: 'vàng', size: 'M' },
          priceEstimate: 350000,
        },
      ],
      customerName: 'Trần Thị Thu Trang',
      customerPhone: '0988 123 456',
      shippingAddress: 'Số 12 ngõ 80 Chùa Láng, Đống Đa, Hà Nội',
      confidenceScore: 0.95,
      notes: 'Giao giờ hành chính',
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: aiOutputJson }],
            },
          },
        ],
      }),
    });

    const client = new GeminiClient({
      apiKey: 'test-api-key',
      model: 'gemini-2.5-flash',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const input = 'Shop ơi lấy mình 2 cái váy hoa màu vàng size M giao về 12 ngõ 80 Chùa Láng, sđt 0988 123 456 nhé';
    const result = await client.extractOrderEntity(input, { customerName: 'Trần Thị Thu Trang' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Kiểm tra cấu trúc prompt có chứa thẻ bảo vệ <customer_input> chống injection
    const callArgs = mockFetch.mock.calls[0]!;
    const requestBody = JSON.parse(callArgs[1].body as string);
    const sentPrompt = requestBody.contents[0].parts[0].text;
    expect(sentPrompt).toContain('<customer_input>');
    expect(sentPrompt).toContain(input);
    expect(sentPrompt).toContain('</customer_input>');

    // Kiểm tra kết quả trích xuất
    expect(result.customerName).toBe('Trần Thị Thu Trang');
    expect(result.customerPhone).toBe('0988123456'); // Đã được chuẩn hóa 10 số
    expect(result.shippingAddress).toBe('Số 12 ngõ 80 Chùa Láng, Đống Đa, Hà Nội');
    expect(result.items[0]!.productCode).toBe('VAYHOA01');
    expect(result.items[0]!.quantity).toBe(2);
    expect(result.items[0]!.attributes.color).toBe('vàng');
    expect(result.items[0]!.attributes.size).toBe('M');
    expect(result.confidenceScore).toBe(0.95);
    expect(result.notes).toBe('Giao giờ hành chính');
    expect(result.extractionMethod).toBe('ai_gemini');
  });

  it('xử lý lỗi Rate Limit / Quota Exceeded (429) một cách an toàn', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'RESOURCE_EXHAUSTED: Rate limit exceeded',
    });

    const client = new GeminiClient({
      apiKey: 'test-api-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.extractOrderEntity('Lấy 1 áo sđt 0912345678')).rejects.toThrow(
      GeminiClientError
    );

    try {
      await client.extractOrderEntity('Lấy 1 áo sđt 0912345678');
    } catch (err) {
      const error = err as GeminiClientError;
      expect(error.statusCode).toBe(429);
      expect(error.isTransient).toBe(true);
    }
  });

  it('xử lý lỗi timeout khi yêu cầu vượt quá thời gian cho phép', async () => {
    const mockFetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Should not reach here'));
        }, 500);

        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }
      });
    });

    const client = new GeminiClient({
      apiKey: 'test-api-key',
      timeoutMs: 50,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.extractOrderEntity('Lấy 1 áo sđt 0912345678')).rejects.toThrow(
      GeminiClientError
    );

    try {
      await client.extractOrderEntity('Lấy 1 áo sđt 0912345678');
    } catch (err) {
      const error = err as GeminiClientError;
      expect(error.statusCode).toBe(504);
      expect(error.isTransient).toBe(true);
    }
  });

  it('xử lý phản hồi JSON không hợp lệ từ model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Đây không phải JSON: { lỗi cú pháp' }],
            },
          },
        ],
      }),
    });

    const client = new GeminiClient({
      apiKey: 'test-api-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.extractOrderEntity('Lấy 1 áo sđt 0912345678')).rejects.toThrow(
      /Failed to parse Gemini JSON output/
    );
  });
});
