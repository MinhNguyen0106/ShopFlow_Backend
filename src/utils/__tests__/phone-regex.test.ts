/**
 * ShopFlow - Phone Regex Unit Tests
 * File: backend/src/utils/__tests__/phone-regex.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  maskPhoneNumber,
  hasPhoneNumber,
  extractPhoneNumbers,
} from '../phone-regex.js';

describe('Phone Regex & Masking Utility', () => {
  describe('normalizePhoneNumber', () => {
    it('chuẩn hóa các định dạng cơ bản của 5 nhà mạng chính', () => {
      // Viettel 03x, 086, 09x
      expect(normalizePhoneNumber('0981234567')).toBe('0981234567');
      expect(normalizePhoneNumber('0381234567')).toBe('0381234567');
      expect(normalizePhoneNumber('0861234567')).toBe('0861234567');

      // Mobifone 07x, 090, 089
      expect(normalizePhoneNumber('0909123456')).toBe('0909123456');
      expect(normalizePhoneNumber('0791234567')).toBe('0791234567');

      // Vinaphone 08x, 091, 094
      expect(normalizePhoneNumber('0912345678')).toBe('0912345678');
      expect(normalizePhoneNumber('0841234567')).toBe('0841234567');

      // Vietnamobile 05x, 092
      expect(normalizePhoneNumber('0561234567')).toBe('0561234567');
      expect(normalizePhoneNumber('0921234567')).toBe('0921234567');
    });

    it('chuẩn hóa các biến thể chứa mã quốc gia (+84 hoặc 84)', () => {
      expect(normalizePhoneNumber('+84981234567')).toBe('0981234567');
      expect(normalizePhoneNumber('84981234567')).toBe('0981234567');
      expect(normalizePhoneNumber('+84 981 234 567')).toBe('0981234567');
      expect(normalizePhoneNumber('(+84) 981.234.567')).toBe('0981234567');
    });

    it('chuẩn hóa các biến thể chứa dấu phân cách: dấu chấm, khoảng trắng, gạch nối', () => {
      expect(normalizePhoneNumber('098.123.4567')).toBe('0981234567');
      expect(normalizePhoneNumber('098 123 4567')).toBe('0981234567');
      expect(normalizePhoneNumber('098-123-4567')).toBe('0981234567');
      expect(normalizePhoneNumber('0987.65.43.21')).toBe('0987654321');
    });

    it('chuẩn hóa các biến thể lách kiểm duyệt bằng chữ o/O thay cho số 0', () => {
      expect(normalizePhoneNumber('o981234567')).toBe('0981234567');
      expect(normalizePhoneNumber('O98.123.4567')).toBe('0981234567');
      expect(normalizePhoneNumber('O 9 8 1 2 3 4 5 6 7')).toBe('0981234567');
    });

    it('từ chối các chuỗi không phải số điện thoại hợp lệ', () => {
      expect(normalizePhoneNumber('123456')).toBeNull();
      expect(normalizePhoneNumber('0123456789')).toBeNull(); // Đầu 01 không còn tồn tại ở VN
      expect(normalizePhoneNumber('02412345678')).toBeNull(); // Số cố định 11 số
      expect(normalizePhoneNumber('abcdefghij')).toBeNull();
      expect(normalizePhoneNumber('')).toBeNull();
    });
  });

  describe('maskPhoneNumber', () => {
    it('che 4 chữ số giữa của số điện thoại', () => {
      expect(maskPhoneNumber('0981234567')).toBe('098****567');
      expect(maskPhoneNumber('090.912.3456')).toBe('090****456');
      expect(maskPhoneNumber('+84912345678')).toBe('091****678');
    });

    it('trả về placeholder an toàn nếu chuỗi không hợp lệ', () => {
      expect(maskPhoneNumber('')).toBe('***');
    });
  });

  describe('hasPhoneNumber', () => {
    it('phát hiện chính xác sự xuất hiện của số điện thoại trong bình luận', () => {
      expect(hasPhoneNumber('Shop ơi ship cho mình về địa chỉ này nhé: 0981234567')).toBe(true);
      expect(hasPhoneNumber('Alo sđt mình O98.123.4567 tư vấn giúp')).toBe(true);
      expect(hasPhoneNumber('check inbox giúp mình qua số +84 909 123 456')).toBe(true);
      expect(hasPhoneNumber('Giá bao nhiêu vậy shop? Có size L không?')).toBe(false);
      expect(hasPhoneNumber('Sản phẩm mã #SP100 giá 250k nhé')).toBe(false);
    });
  });

  describe('extractPhoneNumbers', () => {
    it('trích xuất danh sách số điện thoại kèm chuỗi normalized và masked', () => {
      const comment = 'Gọi cho mình theo số 098.123.4567 hoặc số phụ 090 912 3456 nha';
      const extracted = extractPhoneNumbers(comment);

      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toEqual({
        raw: '098.123.4567',
        normalized: '0981234567',
        masked: '098****567',
      });
      expect(extracted[1]).toEqual({
        raw: '090 912 3456',
        normalized: '0909123456',
        masked: '090****456',
      });
    });

    it('loại bỏ các số điện thoại trùng lặp trong cùng một bình luận', () => {
      const comment = 'Sđt mình là 0981234567, nhắc lại là 098.123.4567 nha shop';
      const extracted = extractPhoneNumbers(comment);

      expect(extracted).toHaveLength(1);
      expect(extracted[0]?.normalized).toBe('0981234567');
    });

    it('trả về mảng rỗng nếu không tìm thấy số điện thoại', () => {
      const comment = 'Áo này chất vải gì vậy shop ơi?';
      const extracted = extractPhoneNumbers(comment);

      expect(extracted).toEqual([]);
    });
  });
});
