/**
 * ShopFlow - Phone Number Detection & Masking Utility
 * File: backend/src/utils/phone-regex.ts
 *
 * Cung cấp Regex tối ưu nhận diện số điện thoại di động tại Việt Nam
 * (các đầu số 03, 05, 07, 08, 09, mã quốc gia +84/84, dấu phân cách, chữ o/O cách điệu)
 * và tiện ích che dấu dữ liệu nhạy cảm (PII Data Masking).
 */

export interface ExtractedPhoneNumber {
  raw: string;         // Chuỗi gốc bắt được trong văn bản (ví dụ: '098.123.4567', 'O98 123 4567')
  normalized: string;  // Chuỗi số chuẩn 10 chữ số bắt đầu bằng 0 (ví dụ: '0981234567')
  masked: string;      // Chuỗi hiển thị an toàn cho log/audit (ví dụ: '098****567')
}

/**
 * Danh sách đầu số di động 2 chữ số hợp lệ tại Việt Nam (theo quy hoạch kho số viễn thông):
 * - Viettel:       032, 033, 034, 035, 036, 037, 038, 039, 086, 096, 097, 098
 * - Mobifone:      070, 079, 077, 076, 078, 089, 090, 093
 * - Vinaphone:     081, 082, 083, 084, 085, 088, 091, 094
 * - Vietnamobile:  052, 056, 058, 092
 * - Gmobile:       059, 099
 * - Itelecom:      087
 * - Wintel:        055
 * => Mọi SĐT di động Việt Nam đều có 10 chữ số và bắt đầu bằng: 03, 05, 07, 08, 09
 */
const VALID_VN_PREFIXES = ['03', '05', '07', '08', '09'];

/**
 * Biểu thức chính quy quét số điện thoại di động Việt Nam trong văn bản.
 * Hỗ trợ:
 * - Tiền tố: 0, o, O, +84, 84, (+84)
 * - Đầu số: 3, 5, 7, 8, 9
 * - Dấu phân cách linh hoạt: khoảng trắng, dấu chấm, dấu gạch ngang, gạch dưới
 * - Tổng số chữ số phần thân là 8 chữ số (kèm đầu số tạo thành SĐT 10 số)
 */
export const VN_PHONE_REGEX =
  /(?:(?:\+84|84|\(84\)|\(\+84\))[\s.-]*|[0oO])([35789])(?:[\s.-]*\d){8}\b/gi;

/**
 * Chuẩn hóa một chuỗi số điện thoại về định dạng chuẩn 10 số (bắt đầu bằng 0).
 * Thay thế 'o'/'O' thành '0', loại bỏ ký tự đặc biệt và quy đổi +84/84 thành 0.
 *
 * @param rawPhone Chuỗi số điện thoại thô
 * @returns Chuỗi 10 chữ số chuẩn hoặc null nếu không hợp lệ
 */
export function normalizePhoneNumber(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return null;
  }

  // 1. Thay thế chữ 'o' và 'O' thường dùng để lách kiểm duyệt thành số '0'
  let cleaned = rawPhone.trim().replace(/[oO]/g, '0');

  // 2. Loại bỏ các ký tự phân cách (khoảng trắng, dấu chấm, dấu ngoặc, gạch ngang, gạch dưới)
  cleaned = cleaned.replace(/[\s().\-_]/g, '');

  // 3. Quy đổi tiền tố quốc gia (+84 hoặc 84) về 0
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // 4. Kiểm tra độ dài chuẩn (10 chữ số) và đầu số hợp lệ
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    const prefix = cleaned.slice(0, 2);
    if (VALID_VN_PREFIXES.includes(prefix)) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Che dấu số điện thoại phục vụ bảo mật thông tin cá nhân (PII Protection).
 * Ví dụ: '0981234567' -> '098****567'
 *
 * @param phone Số điện thoại (raw hoặc normalized)
 * @returns Chuỗi đã được che dấu an toàn
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '***';
  }

  const normalized = normalizePhoneNumber(phone) || phone.replace(/\D/g, '');
  if (normalized.length >= 10) {
    // Giữ 3 số đầu và 3 số cuối, che 4 số giữa
    return `${normalized.slice(0, 3)}****${normalized.slice(-3)}`;
  }

  if (normalized.length > 4) {
    return `${normalized.slice(0, 2)}****${normalized.slice(-2)}`;
  }

  return '****';
}

/**
 * Kiểm tra xem chuỗi văn bản có chứa số điện thoại hợp lệ hay không.
 *
 * @param text Nội dung bình luận hoặc tin nhắn
 */
export function hasPhoneNumber(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Reset regex state trước khi test vì cờ 'g' lưu lastIndex
  VN_PHONE_REGEX.lastIndex = 0;
  const matches = text.match(VN_PHONE_REGEX);
  if (!matches || matches.length === 0) {
    return false;
  }

  return matches.some((match) => normalizePhoneNumber(match) !== null);
}

/**
 * Trích xuất toàn bộ các số điện thoại tìm thấy trong nội dung bình luận.
 * Tự động loại bỏ các số trùng lặp sau chuẩn hóa.
 *
 * @param text Nội dung bình luận hoặc tin nhắn
 * @returns Mảng danh sách các số điện thoại được phát hiện
 */
export function extractPhoneNumbers(text: string): ExtractedPhoneNumber[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  VN_PHONE_REGEX.lastIndex = 0;
  const matches = text.match(VN_PHONE_REGEX);
  if (!matches) {
    return [];
  }

  const results: ExtractedPhoneNumber[] = [];
  const seenNormalized = new Set<string>();

  for (const match of matches) {
    const normalized = normalizePhoneNumber(match);
    if (normalized && !seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      results.push({
        raw: match.trim(),
        normalized,
        masked: maskPhoneNumber(normalized),
      });
    }
  }

  return results;
}
