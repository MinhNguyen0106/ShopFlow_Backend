/**
 * ShopFlow - Hybrid Order Parser Service (TASK-20)
 * File: backend/src/core/services/order-parser.service.ts
 */

import { ParseOrderInput, ExtractedOrderEntity } from '../../api/dtos/order-parser.dto.js';
import { RegexOrderParser, regexOrderParser } from './regex-order-parser.js';
import { GeminiClient, geminiClient } from '../../infrastructure/ai/gemini.client.js';

export interface OrderParserServiceDependencies {
  regexParser?: RegexOrderParser;
  aiClient?: GeminiClient;
}

export class OrderParserService {
  private readonly regexParser: RegexOrderParser;
  private readonly aiClient: GeminiClient;

  // Ngưỡng điểm tin cậy để chốt kết quả Regex mà không cần gọi Gemini AI
  private readonly CONFIDENCE_THRESHOLD = 0.8;

  constructor(deps: OrderParserServiceDependencies = {}) {
    this.regexParser = deps.regexParser ?? regexOrderParser;
    this.aiClient = deps.aiClient ?? geminiClient;
  }

  /**
   * Phân tích và trích xuất thực thể đơn hàng theo kiến trúc Hybrid 2 tầng:
   * - Tầng 1: Regex Fast-path (< 50ms, 0 chi phí token)
   * - Tầng 2: Google Gemini AI Fallback khi ngôn ngữ tự do phức tạp
   */
  public async parseOrder(input: ParseOrderInput): Promise<ExtractedOrderEntity> {
    const rawText = input.text.trim();
    const customerName =
      typeof input.context?.customerName === 'string'
        ? input.context.customerName
        : undefined;

    const defaultProductCode =
      typeof input.context?.defaultProductCode === 'string'
        ? input.context.defaultProductCode
        : typeof input.context?.productCode === 'string'
          ? input.context.productCode
          : undefined;

    // --- TẦNG 1: REGEX FAST-PATH ---
    const regexResult = this.regexParser.parse(rawText, {
      customerName,
      defaultProductCode,
    });

    // Nếu Regex nhận diện chắc chắn (đủ mã SP, SĐT hoặc địa chỉ) -> Trả về ngay
    if (regexResult.confidenceScore >= this.CONFIDENCE_THRESHOLD) {
      return regexResult;
    }

    // --- TẦNG 2: GOOGLE GEMINI AI FALLBACK ---
    try {
      const aiResult = await this.aiClient.extractOrderEntity(rawText, {
        customerName,
        defaultProductCode,
      });

      // Nếu AI trả về kết quả có độ tin cậy tốt hơn hoặc tương đương
      if (aiResult.confidenceScore >= regexResult.confidenceScore) {
        return aiResult;
      }

      // Nếu AI cho điểm thấp hơn cả Regex, ưu tiên Regex
      return regexResult;
    } catch (aiError: unknown) {
      // Khi Gemini AI lỗi (quota limit, timeout, rớt mạng), tự động fallback về Regex
      const fallbackNotes = `Fallback: Gemini AI unavailable (${
        aiError instanceof Error ? aiError.message : String(aiError)
      })`;

      return {
        ...regexResult,
        extractionMethod: 'regex_fallback',
        notes: regexResult.notes
          ? `${regexResult.notes} | ${fallbackNotes}`
          : fallbackNotes,
      };
    }
  }
}

export const orderParserService = new OrderParserService();
