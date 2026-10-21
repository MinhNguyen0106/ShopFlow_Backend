import { describe, it, expect } from 'vitest';
import {
  normalizeVietnamesePhone,
  parseVietnameseQuantity,
  extractProductCode,
  extractAttributes,
} from '../vietnamese-parser.helper.js';

describe('Vietnamese Parser Helper Tests', () => {
  describe('normalizeVietnamesePhone', () => {
    it('normalizes standard 10-digit mobile phone numbers', () => {
      expect(normalizeVietnamesePhone('0988654321')).toBe('0988654321');
      expect(normalizeVietnamesePhone('0398765432')).toBe('0398765432');
      expect(normalizeVietnamesePhone('0771234567')).toBe('0771234567');
      expect(normalizeVietnamesePhone('0868889999')).toBe('0868889999');
      expect(normalizeVietnamesePhone('0521234567')).toBe('0521234567');
    });

    it('handles phone numbers with international +84 and 84 prefixes', () => {
      expect(normalizeVietnamesePhone('+84988654321')).toBe('0988654321');
      expect(normalizeVietnamesePhone('84988654321')).toBe('0988654321');
    });

    it('strips dots, spaces, dashes, and parentheses', () => {
      expect(normalizeVietnamesePhone('0988.654.321')).toBe('0988654321');
      expect(normalizeVietnamesePhone('0988 654 321')).toBe('0988654321');
      expect(normalizeVietnamesePhone('0988-654-321')).toBe('0988654321');
      expect(normalizeVietnamesePhone('(+84) 0988 654 321')).toBe('0988654321');
    });

    it('returns null for invalid or incomplete numbers', () => {
      expect(normalizeVietnamesePhone('123456')).toBeNull();
      expect(normalizeVietnamesePhone('0123456789')).toBeNull(); // 01 is no longer valid mobile prefix
      expect(normalizeVietnamesePhone('')).toBeNull();
      expect(normalizeVietnamesePhone(null)).toBeNull();
    });
  });

  describe('parseVietnameseQuantity', () => {
    it('extracts numeric quantities', () => {
      expect(parseVietnameseQuantity('lấy 2 cái nhé')).toBe(2);
      expect(parseVietnameseQuantity('#SP01 3 chiếc')).toBe(3);
      expect(parseVietnameseQuantity('x5 bộ')).toBe(5);
      expect(parseVietnameseQuantity('sl: 4')).toBe(4);
    });

    it('extracts word-based Vietnamese quantities', () => {
      expect(parseVietnameseQuantity('cho em một cái áo')).toBe(1);
      expect(parseVietnameseQuantity('lấy hai cái đầm')).toBe(2);
      expect(parseVietnameseQuantity('mua một đôi giày')).toBe(2);
      expect(parseVietnameseQuantity('chị lấy ba cái')).toBe(3);
      expect(parseVietnameseQuantity('ship năm hộp kem')).toBe(5);
      expect(parseVietnameseQuantity('lấy một chục')).toBe(10);
    });

    it('defaults to 1 when no quantity mentioned', () => {
      expect(parseVietnameseQuantity('chị lấy váy hoa nhí nhé')).toBe(1);
      expect(parseVietnameseQuantity('#SP01 đỏ L')).toBe(1);
      expect(parseVietnameseQuantity('')).toBe(1);
    });
  });

  describe('extractProductCode', () => {
    it('extracts SKU from hashtags', () => {
      expect(extractProductCode('#SP01 2 cái đỏ')).toBe('SP01');
      expect(extractProductCode('Cho chị mẫu #AO_HOA size M')).toBe('AO_HOA');
    });

    it('extracts SKU from square brackets', () => {
      expect(extractProductCode('[DAM_NU] màu đen size L')).toBe('DAM_NU');
    });

    it('extracts SKU from keywords like mã, sku, sp', () => {
      expect(extractProductCode('mã SP002 1 cái')).toBe('SP002');
      expect(extractProductCode('sku: VAY09 trắng S')).toBe('VAY09');
      expect(extractProductCode('sp AO_LEN_01')).toBe('AO_LEN_01');
    });

    it('returns null when no SKU code found', () => {
      expect(extractProductCode('em ơi tư vấn size áo khoác giúp chị')).toBeNull();
      expect(extractProductCode('')).toBeNull();
    });
  });

  describe('extractAttributes', () => {
    it('extracts color and size from comments', () => {
      const attrs = extractAttributes('#SP01 2 cái đỏ size L');
      expect(attrs.color).toBe('đỏ');
      expect(attrs.size).toBe('L');
    });

    it('extracts compound colors like cam đất, xanh ngọc', () => {
      const attrs1 = extractAttributes('màu cam đất size M');
      expect(attrs1.color).toBe('cam đất');
      expect(attrs1.size).toBe('M');

      const attrs2 = extractAttributes('cho mình áo xanh ngọc sz XL');
      expect(attrs2.color).toBe('xanh ngọc');
      expect(attrs2.size).toBe('XL');
    });

    it('extracts freesize', () => {
      const attrs = extractAttributes('áo thun đen freesize');
      expect(attrs.color).toBe('đen');
      expect(attrs.size).toBe('FREESIZE');
    });
  });
});
