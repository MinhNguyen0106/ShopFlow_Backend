/**
 * ShopFlow - Unit Tests: keyword-matcher.service.ts
 * File: backend/src/core/services/__tests__/keyword-matcher.service.test.ts
 */

import { describe, it, expect } from 'vitest';
import { KeywordMatcherService } from '../keyword-matcher.service.js';

describe('KeywordMatcherService', () => {
  const service = new KeywordMatcherService();

  describe('normalizeText() & removeVietnameseTones()', () => {
    it('nên chuyển chữ thường và dọn dẹp khoảng trắng thừa', () => {
      expect(service.normalizeText('  GIÁ   Bao Nhiêu   ')).toBe('giá bao nhiêu');
    });

    it('nên loại bỏ dấu tiếng Việt chính xác', () => {
      expect(service.removeVietnameseTones('Áo Thun Cực Đẹp')).toBe('Ao Thun Cuc Dep');
      expect(service.removeVietnameseTones('tư vấn và báo giá')).toBe('tu van va bao gia');
    });
  });

  describe('matches()', () => {
    const keywords = ['giá', 'tư vấn', 'inbox', 'bao nhiêu'];

    it('nên khớp khi bình luận chứa từ khóa có dấu chính xác', () => {
      const result = service.matches('Shop cho em xin giá với ạ', keywords);
      expect(result.isMatch).toBe(true);
      expect(result.matchedKeyword).toBe('giá');
    });

    it('nên khớp khi khách gõ không dấu (gia thay vì giá)', () => {
      const result = service.matches('Cho minh hoi gia san pham nay', keywords);
      expect(result.isMatch).toBe(true);
      expect(result.matchedKeyword).toBe('giá');
    });

    it('nên khớp với từ khóa viết hoa thường hỗn hợp', () => {
      const result = service.matches('INBOX EM VỚI SHOP', keywords);
      expect(result.isMatch).toBe(true);
      expect(result.matchedKeyword).toBe('inbox');
    });

    it('không nên khớp khi bình luận không chứa bất kỳ từ khóa nào', () => {
      const result = service.matches('Hàng đẹp quá shop ơi', keywords);
      expect(result.isMatch).toBe(false);
      expect(result.matchedKeyword).toBeUndefined();
    });

    it('nên trả về false khi text rỗng hoặc danh sách từ khóa rỗng', () => {
      expect(service.matches('', keywords).isMatch).toBe(false);
      expect(service.matches('test', []).isMatch).toBe(false);
    });
  });

  describe('renderTemplate()', () => {
    it('nên thay thế placeholder {{customer_name}} và {{page_name}}', () => {
      const template = 'Chào {{customer_name}}, cảm ơn bạn đã quan tâm {{page_name}}!';
      const rendered = service.renderTemplate(template, {
        customer_name: 'Lan Anh',
        page_name: 'Shop Thời Trang ABC',
      });

      expect(rendered).toBe('Chào Lan Anh, cảm ơn bạn đã quan tâm Shop Thời Trang ABC!');
    });

    it('hỗ trợ placeholder cú pháp đơn {customer_name} và {name}', () => {
      const template = 'Chào {name}, {page_name} đã gửi tin nhắn riêng cho bạn.';
      const rendered = service.renderTemplate(template, {
        customer_name: 'Thanh Hằng',
        page_name: 'Shop Mỹ Phẩm',
      });

      expect(rendered).toBe('Chào Thanh Hằng, Shop Mỹ Phẩm đã gửi tin nhắn riêng cho bạn.');
    });

    it('sử dụng giá trị mặc định khi khuyết tên khách hàng hoặc tên shop', () => {
      const template = 'Chào {{customer_name}}, {{page_name}} xin chào!';
      const rendered = service.renderTemplate(template, {});

      expect(rendered).toBe('Chào bạn, Shop xin chào!');
    });

    it('trả về chuỗi rỗng khi template rỗng hoặc falsy', () => {
      expect(service.renderTemplate('', {})).toBe('');
      expect(service.normalizeText('')).toBe('');
    });

    it('bỏ qua các keyword rỗng hoặc không phải chuỗi trong danh sách', () => {
      const result = service.matches('Chào shop', ['', '   ', null as unknown as string, 'Chào']);
      expect(result.isMatch).toBe(true);
      expect(result.matchedKeyword).toBe('Chào');
    });
  });
});
