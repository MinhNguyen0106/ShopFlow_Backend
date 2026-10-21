import { describe, it, expect } from 'vitest';
import { VietQrHelper, VIETNAM_BANKS } from '../vietqr.helper.js';

describe('VietQrHelper (TASK-23)', () => {
  describe('calculateCrc16', () => {
    it('tính toán mã kiểm tra CRC16-CCITT chuẩn 4 ký tự hex viết hoa', () => {
      const sample = '00020101021238540010A00000072701240006970436011010293847560208QRIBFTTA530370454062500005802VN62140810ORD20260016304';
      const crc = VietQrHelper.calculateCrc16(sample);
      expect(crc).toMatch(/^[0-9A-F]{4}$/);
      expect(crc.length).toBe(4);
    });

    it('tạo CRC16 giống nhau khi đầu vào giống nhau (Deterministic)', () => {
      const text = 'TEST_STRING_12345';
      const crc1 = VietQrHelper.calculateCrc16(text);
      const crc2 = VietQrHelper.calculateCrc16(text);
      expect(crc1).toBe(crc2);
    });
  });

  describe('formatTlv', () => {
    it('định dạng đúng Tag - 2 chữ số Length - Value', () => {
      const tlv = VietQrHelper.formatTlv('00', '01');
      expect(tlv).toBe('000201');

      const tlvText = VietQrHelper.formatTlv('58', 'VN');
      expect(tlvText).toBe('5802VN');
    });
  });

  describe('generateEmvCoPayload', () => {
    it('sinh chuỗi EMVCo Napas 247 Dynamic QR có số tiền và nội dung chuyển khoản', () => {
      const payload = VietQrHelper.generateEmvCoPayload({
        bankBin: '970436', // Vietcombank
        accountNo: '1029384756',
        amount: 250000,
        memo: 'ORD2026001',
      });

      // Kiểm tra các tag bắt buộc
      expect(payload.startsWith('000201')).toBe(true); // Tag 00
      expect(payload).toContain('010212'); // Tag 01 Dynamic
      expect(payload).toContain('A000000727'); // Napas AID
      expect(payload).toContain('970436'); // Bank BIN
      expect(payload).toContain('1029384756'); // Account No
      expect(payload).toContain('QRIBFTTA'); // Service
      expect(payload).toContain('5303704'); // VND
      expect(payload).toContain('5406250000'); // Amount 250000
      expect(payload).toContain('5802VN'); // Country
      expect(payload).toContain('ORD2026001'); // Memo
      expect(payload).toMatch(/6304[0-9A-F]{4}$/); // Tag 63 CRC
    });

    it('sinh chuỗi EMVCo Static QR khi không có số tiền', () => {
      const payload = VietQrHelper.generateEmvCoPayload({
        bankBin: '970422', // MBBank
        accountNo: '0987654321',
      });

      expect(payload).toContain('010211'); // Static QR
      expect(payload).toContain('53037045802VN'); // Tag 53 trực tiếp đến Tag 58 (không có Tag 54 số tiền)
    });
  });

  describe('generateQuickLinkUrl', () => {
    it('sinh URL ảnh VietQR QuickLink hợp lệ', () => {
      const url = VietQrHelper.generateQuickLinkUrl({
        bankBin: '970436',
        accountNo: '1029384756',
        accountName: 'NGUYEN VAN A',
        amount: 500000,
        memo: 'ORD-2026-001',
      });

      expect(url).toContain('https://img.vietqr.io/image/970436-1029384756-compact2.png');
      expect(url).toContain('amount=500000');
      expect(url).toContain('addInfo=ORD-2026-001');
      expect(url).toContain('accountName=NGUYEN+VAN+A');
    });
  });

  describe('extractOrderCodeFromTransferContent', () => {
    it('trích xuất đúng mã đơn hàng có gạch nối ORD-2026-001', () => {
      const text = 'MBVCB.123456.SF ORD-2026-001 CHUYEN TIEN DONG GOI';
      const extracted = VietQrHelper.extractOrderCodeFromTransferContent(text);
      expect(extracted).toBe('ORD-2026-001');
    });

    it('trích xuất đúng mã đơn hàng viết liền ORD2026001', () => {
      const text = 'NGUYEN THI B THANH TOAN SFORD2026001';
      const extracted = VietQrHelper.extractOrderCodeFromTransferContent(text);
      expect(extracted).toBe('ORD-2026-001');
    });

    it('trích xuất đúng mã đơn hàng có dấu cách ORD 2026 002', () => {
      const text = 'ORD 2026 002 CHUYEN KHOAN';
      const extracted = VietQrHelper.extractOrderCodeFromTransferContent(text);
      expect(extracted).toBe('ORD-2026-002');
    });

    it('trả về null nếu không tìm thấy mã đơn hàng', () => {
      const text = 'CHUC MUNG SINH NHAT ANH TUAN';
      const extracted = VietQrHelper.extractOrderCodeFromTransferContent(text);
      expect(extracted).toBeNull();
    });
  });

  describe('VIETNAM_BANKS dictionary', () => {
    it('chứa danh mục ngân hàng phổ biến tại Việt Nam', () => {
      expect(VIETNAM_BANKS['970436']?.shortName).toBe('VCB');
      expect(VIETNAM_BANKS['970422']?.shortName).toBe('MB');
      expect(VIETNAM_BANKS['970407']?.shortName).toBe('TCB');
    });
  });
});
