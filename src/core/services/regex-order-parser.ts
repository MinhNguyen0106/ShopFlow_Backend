/**
 * ShopFlow - Fast-Path Regex Order Parser (TASK-20)
 * File: backend/src/core/services/regex-order-parser.ts
 */

import { ExtractedOrderEntity, ExtractedOrderItem } from '../../api/dtos/order-parser.dto.js';
import {
  normalizeVietnamesePhone,
  parseVietnameseQuantity,
  extractProductCode,
  extractAttributes,
} from '../utils/vietnamese-parser.helper.js';

export interface RegexParseOptions {
  customerName?: string;
  defaultProductCode?: string;
}

export class RegexOrderParser {
  /**
   * Trích xuất thông tin đơn hàng bằng Regex tốc độ cao (< 50ms)
   */
  public parse(text: string, options: RegexParseOptions = {}): ExtractedOrderEntity {
    const rawInput = text || '';
    const cleanText = rawInput.trim();

    // 1. Bóc tách số điện thoại liên lạc
    const customerPhone = normalizeVietnamesePhone(cleanText);

    // 2. Bóc tách mã sản phẩm (SKU)
    const productCode = extractProductCode(cleanText) || options.defaultProductCode || null;

    // 3. Bóc tách số lượng
    const quantity = parseVietnameseQuantity(cleanText);

    // 4. Bóc tách thuộc tính biến thể (màu sắc, kích cỡ)
    const attributes = extractAttributes(cleanText);

    // 5. Bóc tách địa chỉ giao hàng sơ bộ (nếu có tiền tố chỉ dẫn)
    const shippingAddress = this.extractAddress(cleanText);

    // 6. Tính toán điểm tin cậy (Confidence Score)
    const confidenceScore = this.calculateConfidence(productCode, customerPhone, attributes, shippingAddress);

    const item: ExtractedOrderItem = {
      productCode,
      productName: productCode ? `Sản phẩm ${productCode}` : null,
      quantity,
      attributes,
      priceEstimate: null,
    };

    return {
      items: [item],
      customerName: options.customerName || null,
      customerPhone,
      shippingAddress,
      confidenceScore,
      rawInput,
      extractionMethod: 'regex',
      notes: null,
    };
  }

  /**
   * Bóc tách địa chỉ giao hàng từ tiền tố tiếng Việt phổ biến
   */
  private extractAddress(text: string): string | null {
    // 1. Tìm sau các từ khóa chỉ định địa chỉ giao hàng
    // Địa chỉ có thể chứa dấu phẩy (Cầu Giấy, Hà Nội), chỉ dừng lại khi gặp từ khóa SĐT, số điện thoại, dấu chấm phẩy, xuống dòng hoặc từ chuyển tiếp mua hàng
    const prefixRegex =
      /(?:địa chỉ|dia chi|d\/c|dc|đc|ship về|ship ve|gửi về|gui ve|giao về|giao ve|gửi đến|giao đến|tới|nhận tại)\s*[:=]?\s*([0-9a-zA-ZÀ-ỹ\s,./-]+?)(?=(?:[;\n]|\b(?:sđt|sdt|tel|phone|gọi|lh|liên hệ|lấy|chốt|size|màu)\b|\b0[35789]\d{8}\b|$))/i;

    const match = text.match(prefixRegex);
    if (match && match[1]) {
      const candidate = match[1].trim().replace(/^[,\s.-]+|[,\s.-]+$/g, '');
      // Địa chỉ hợp lệ thường có độ dài tối thiểu 8 ký tự và không chỉ gồm số
      if (candidate.length >= 8 && !/^\d+$/.test(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Tính toán độ tin cậy dựa trên các trường thông tin bóc tách được
   */
  private calculateConfidence(
    productCode: string | null,
    phone: string | null,
    attributes: { color?: string; size?: string },
    address: string | null
  ): number {
    let score = 0.2;

    if (productCode) score += 0.45;
    if (phone) score += 0.25;
    if (attributes.color || attributes.size) score += 0.1;
    if (address) score += 0.1;

    return Math.min(Math.round(score * 100) / 100, 1.0);
  }
}

export const regexOrderParser = new RegexOrderParser();
