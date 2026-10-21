/**
 * ShopFlow - Keyword Matcher & Template Rendering Service
 * File: backend/src/core/services/keyword-matcher.service.ts
 *
 * Đối soát từ khóa kích hoạt kịch bản tự động hóa và điền dữ liệu động vào mẫu phản hồi.
 */

export interface KeywordMatchResult {
  isMatch: boolean;
  matchedKeyword?: string;
}

export interface TemplatePlaceholders {
  customer_name?: string | null;
  page_name?: string | null;
}

export class KeywordMatcherService {
  /**
   * Chuẩn hóa chuỗi văn bản (chuyển chữ thường, xóa khoảng trắng thừa).
   */
  normalizeText(text: string): string {
    if (!text) return '';
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Bỏ dấu tiếng Việt phục vụ so sánh linh hoạt (không phân biệt có/không dấu).
   */
  removeVietnameseTones(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  /**
   * Kiểm tra xem văn bản có khớp với bất kỳ từ khóa kích hoạt nào hay không.
   */
  matches(text: string, keywords: string[]): KeywordMatchResult {
    if (!text || !keywords || keywords.length === 0) {
      return { isMatch: false };
    }

    const normalizedText = this.normalizeText(text);
    const unaccentedText = this.removeVietnameseTones(normalizedText);

    for (const keyword of keywords) {
      if (!keyword || typeof keyword !== 'string') continue;
      const normalizedKeyword = this.normalizeText(keyword);
      if (!normalizedKeyword) continue;

      // 1. Kiểm tra đối sánh trực tiếp có dấu
      if (normalizedText.includes(normalizedKeyword)) {
        return { isMatch: true, matchedKeyword: keyword };
      }

      // 2. Kiểm tra đối sánh không dấu (ví dụ: "gia" khớp với "giá")
      const unaccentedKeyword = this.removeVietnameseTones(normalizedKeyword);
      if (unaccentedText.includes(unaccentedKeyword)) {
        return { isMatch: true, matchedKeyword: keyword };
      }
    }

    return { isMatch: false };
  }

  /**
   * Điền giá trị động vào biểu mẫu phản hồi tự động (Placeholder replacement).
   * Hỗ trợ cú pháp: {{customer_name}}, {customer_name}, {{page_name}}, {page_name}.
   */
  renderTemplate(template: string, placeholders: TemplatePlaceholders): string {
    if (!template) return '';

    const customerName = placeholders.customer_name?.trim() || 'bạn';
    const pageName = placeholders.page_name?.trim() || 'Shop';

    return template
      .replace(/\{\{\s*customer_name\s*\}\}|\{\s*customer_name\s*\}|\{\{\s*name\s*\}\}|\{\s*name\s*\}/gi, customerName)
      .replace(/\{\{\s*page_name\s*\}\}|\{\s*page_name\s*\}/gi, pageName);
  }
}

export const keywordMatcherService = new KeywordMatcherService();
