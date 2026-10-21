/**
 * ShopFlow - VietQR & EMVCo Napas 247 Generator (TASK-23)
 * File: backend/src/core/services/vietqr.helper.ts
 */

export interface BankInfo {
  bin: string;
  shortName: string;
  name: string;
}

export const VIETNAM_BANKS: Record<string, BankInfo> = {
  '970436': { bin: '970436', shortName: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)' },
  '970422': { bin: '970422', shortName: 'MB', name: 'Ngân hàng TMCP Quân Đội (MBBank)' },
  '970415': { bin: '970415', shortName: 'CTG', name: 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)' },
  '970418': { bin: '970418', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam' },
  '970407': { bin: '970407', shortName: 'TCB', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)' },
  '970416': { bin: '970416', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu (ACB)' },
  '970423': { bin: '970423', shortName: 'TPB', name: 'Ngân hàng TMCP Tiên Phong (TPBank)' },
  '970432': { bin: '970432', shortName: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)' },
};

export interface GenerateVietQrOptions {
  bankBin: string;
  accountNo: string;
  accountName?: string;
  amount?: number;
  memo?: string;
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}

export class VietQrHelper {
  /**
   * Tính toán checksum CRC16-CCITT (Polynomial 0x1021, Init 0xFFFF)
   * Chuẩn EMVCo Tag 63
   */
  public static calculateCrc16(data: string): string {
    let crc = 0xffff;
    const polynomial = 0x1021;

    for (let i = 0; i < data.length; i++) {
      const byte = data.charCodeAt(i);
      crc ^= (byte & 0xff) << 8;
      for (let bit = 0; bit < 8; bit++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ polynomial) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Tạo phần tử TLV (Tag - Length - Value) theo chuẩn EMVCo
   */
  public static formatTlv(tag: string, value: string): string {
    const lengthStr = value.length.toString().padStart(2, '0');
    return `${tag}${lengthStr}${value}`;
  }

  /**
   * Sinh chuỗi text QR Payload chuẩn EMVCo Napas 247
   */
  public static generateEmvCoPayload(options: GenerateVietQrOptions): string {
    const { bankBin, accountNo, amount, memo } = options;

    // 1. Tag 00: Payload Format Indicator (01)
    const tag00 = this.formatTlv('00', '01');

    // 2. Tag 01: Point of Initiation Method (12: Dynamic QR nếu có số tiền, 11: Static QR)
    const tag01 = this.formatTlv('01', amount && amount > 0 ? '12' : '11');

    // 3. Tag 38: Merchant Account Information (Napas 247)
    // 38.00: AID = A000000727
    const aid = this.formatTlv('00', 'A000000727');
    // 38.01: Beneficiary Bank BIN + Account No
    const bankTlv = this.formatTlv('00', bankBin);
    const accTlv = this.formatTlv('01', accountNo);
    const beneficiary = this.formatTlv('01', `${bankTlv}${accTlv}`);
    // 38.02: Service Code = QRIBFTTA (Chuyển khoản nhanh Napas 247)
    const service = this.formatTlv('02', 'QRIBFTTA');
    const tag38Value = `${aid}${beneficiary}${service}`;
    const tag38 = this.formatTlv('38', tag38Value);

    // 4. Tag 53: Transaction Currency (704 = VND)
    const tag53 = this.formatTlv('53', '704');

    // 5. Tag 54: Transaction Amount (nếu có)
    let tag54 = '';
    if (amount && amount > 0) {
      tag54 = this.formatTlv('54', Math.round(amount).toString());
    }

    // 6. Tag 58: Country Code (VN)
    const tag58 = this.formatTlv('58', 'VN');

    // 7. Tag 62: Additional Data Field (Nội dung chuyển khoản / Mã đơn hàng)
    let tag62 = '';
    if (memo && memo.trim().length > 0) {
      // 62.08: Purpose of Transaction / Reference Label
      const cleanMemo = memo.trim().slice(0, 50);
      const memoField = this.formatTlv('08', cleanMemo);
      tag62 = this.formatTlv('62', memoField);
    }

    // Ghép toàn bộ chuỗi trước khi tính CRC
    const rawPayloadWithoutCrc = `${tag00}${tag01}${tag38}${tag53}${tag54}${tag58}${tag62}6304`;
    const crc = this.calculateCrc16(rawPayloadWithoutCrc);

    return `${rawPayloadWithoutCrc}${crc}`;
  }

  /**
   * Sinh URL hình ảnh QR VietQR QuickLink (ảnh PNG tải nhanh)
   */
  public static generateQuickLinkUrl(options: GenerateVietQrOptions): string {
    const { bankBin, accountNo, accountName, amount, memo, template = 'compact2' } = options;
    const cleanBin = bankBin.trim();
    const cleanAcc = accountNo.trim();

    let url = `https://img.vietqr.io/image/${cleanBin}-${cleanAcc}-${template}.png`;
    const params = new URLSearchParams();

    if (amount && amount > 0) {
      params.append('amount', Math.round(amount).toString());
    }
    if (memo && memo.trim().length > 0) {
      params.append('addInfo', memo.trim());
    }
    if (accountName && accountName.trim().length > 0) {
      params.append('accountName', accountName.trim());
    }

    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Trích xuất mã đơn hàng từ nội dung chuyển khoản ngân hàng
   * Hỗ trợ các định dạng: 'ORD-2026-001', 'ORD2026001', 'SF ORD-2026-001', 'SFORD2026001'
   */
  public static extractOrderCodeFromTransferContent(content: string): string | null {
    if (!content) return null;
    const normalized = content.toUpperCase().replace(/\s+/g, ' ');

    // Match ORD-YYYY-NNN hoặc ORDYYYYNNN hoặc SF ORD...
    const matchWithHyphen = normalized.match(/ORD[-_ ]?(\d{4})[-_ ]?(\d{3,8})/);
    if (matchWithHyphen) {
      const year = matchWithHyphen[1];
      const seq = matchWithHyphen[2];
      return `ORD-${year}-${seq}`;
    }

    // Match mã đơn hàng tùy chỉnh dạng ORD\w+
    const genericMatch = normalized.match(/ORD[A-Z0-9_-]+/);
    if (genericMatch) {
      return genericMatch[0];
    }

    return null;
  }
}
