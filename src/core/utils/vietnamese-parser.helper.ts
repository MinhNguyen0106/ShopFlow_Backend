/**
 * ShopFlow - Vietnamese Order Parser & Normalization Helpers (TASK-20)
 * File: backend/src/core/utils/vietnamese-parser.helper.ts
 */

/**
 * Chuẩn hóa số điện thoại Việt Nam về định dạng 10 chữ số bắt đầu bằng 0
 * Hỗ trợ các đầu số 03, 05, 07, 08, 09 và tiền tố +84 / 84
 */
export function normalizeVietnamesePhone(raw?: string | null): string | null {
  if (!raw) return null;

  // Tìm kiếm số điện thoại di động Việt Nam trong chuỗi văn bản
  // Cho phép các dấu phân cách như dấu cách, chấm, gạch ngang giữa các cụm số
  // Ví dụ: 0987.654.321, 098 765 4321, +84 987 654 321, 0987-654-321
  const phonePattern =
    /(?:(?:\+84|84|0)\s*[-.]?\s*(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])(?:[\s.-]*\d){7})(?!\d)/;

  const match = raw.match(phonePattern);
  if (match) {
    let clean = match[0].replace(/[\s.\-()]/g, '');
    if (clean.startsWith('+84')) {
      clean = '0' + clean.slice(3);
    } else if (clean.startsWith('84') && clean.length === 11) {
      clean = '0' + clean.slice(2);
    }
    if (/^0[35789]\d{8}$/.test(clean)) {
      return clean;
    }
  }

  return null;
}

/**
 * Trích xuất và chuẩn hóa số lượng sản phẩm từ câu văn
 */
export function parseVietnameseQuantity(text: string): number {
  if (!text) return 1;
  const lower = text.toLowerCase();

  // 1. Tìm số đi kèm rõ ràng từ chỉ loại hàng: "2 cái", "3 đôi", "4 bộ", "1c", "2 chiếc"
  const classifiedRegex =
    /(?:^|[\s,.:;!?-])(\d{1,3})\s*(?:cái|cai|chiếc|chiec|c|bộ|bo|sp|hộp|hop|set|đôi|doi|chai|cây|ao|quần|đầm|váy)(?=$|[\s,.:;!?-])/i;
  const classifiedMatch = text.match(classifiedRegex);
  if (classifiedMatch && classifiedMatch[1]) {
    const num = parseInt(classifiedMatch[1], 10);
    if (num > 0) return num;
  }

  // 2. Tìm số có tiền tố số lượng rõ ràng: "x2", "sl: 3", "sl 2", "số lượng 2"
  const prefixRegex = /(?:x|sl\s*[:=]?\s*|số\s*lượng\s*[:=]?\s*)(\d{1,3})(?=$|[\s,.:;!?-])/i;
  const prefixMatch = text.match(prefixRegex);
  if (prefixMatch && prefixMatch[1]) {
    const num = parseInt(prefixMatch[1], 10);
    if (num > 0) return num;
  }

  // 3. Xử lý trường hợp "một đôi" / "đôi" hoặc "chục"
  if (/(?:^|[\s,.:;!?-])(?:chục|chuc)(?=$|[\s,.:;!?-])/i.test(lower)) {
    return 10;
  }
  if (/(?:^|[\s,.:;!?-])(?:1\s*đôi|một\s*đôi|đôi|doi)(?=$|[\s,.:;!?-])/i.test(lower)) {
    return 2;
  }

  // 3. Tìm số dạng từ chữ tiếng Việt: "hai chiếc", "bốn bộ", "một cái", "ba váy"
  const wordMap: Array<[string, number]> = [
    ['mười', 10],
    ['chín', 9],
    ['tám', 8],
    ['bảy', 7],
    ['sáu', 6],
    ['năm', 5],
    ['bốn', 4],
    ['tư', 4],
    ['ba', 3],
    ['hai', 2],
    ['một', 1],
  ];

  for (const [word, val] of wordMap) {
    const wordPattern = new RegExp(
      `(?:^|[\\s,.:;!?-])${word}\\s+(?:cái|cai|chiếc|chiec|c|bộ|bo|sp|hộp|set|váy|áo|đầm|quần|đôi)(?=$|[\\s,.:;!?-])`,
      'i'
    );
    if (wordPattern.test(lower)) {
      return val;
    }
  }

  // 4. Trường hợp đặc biệt khi từ "đôi" hoặc "chục" đứng một mình không kèm số
  if (/(?:^|[\s,.:;!?-])(?:chục|chuc)(?=$|[\s,.:;!?-])/i.test(lower)) {
    return 10;
  }
  if (/(?:^|[\s,.:;!?-])(?:đôi|doi)\s+(?:tất|giày|dép|ủng|găng|khuyên)(?=$|[\s,.:;!?-])/i.test(lower)) {
    return 2;
  }

  return 1;
}

/**
 * Danh mục màu sắc phổ biến trong ngành thời trang & bán lẻ Việt Nam (sắp xếp dài trước ngắn sau)
 */
export const POPULAR_COLORS = [
  'xanh dương',
  'xanh lá',
  'xanh rêu',
  'xanh mint',
  'xanh ngọc',
  'cam đất',
  'hồng phấn',
  'vàng chanh',
  'đỏ đô',
  'đỏ mận',
  'trắng be',
  'đỏ',
  'đen',
  'trắng',
  'vàng',
  'xanh',
  'hồng',
  'tím',
  'cam',
  'nâu',
  'xám',
  'ghi',
  'be',
  'kem',
  'rêu',
];

/**
 * Danh mục kích cỡ thông dụng
 */
export const POPULAR_SIZES = [
  'freesize',
  'free size',
  'xxl',
  '2xl',
  '3xl',
  'xl',
  'xs',
  's',
  'm',
  'l',
];

/**
 * Bóc tách mã sản phẩm (SKU Code) từ nội dung bình luận
 * Ví dụ: "#SP01", "mã SP002", "[AO_KHOAC]"
 */
export function extractProductCode(text: string): string | null {
  if (!text) return null;

  // Cú pháp có dấu thăng (hashtag): #SP01, #AO23, #VAY_HOA
  const hashtagMatch = text.match(/#([A-Za-z0-9_-]{2,20})/);
  if (hashtagMatch && hashtagMatch[1]) {
    return hashtagMatch[1].toUpperCase();
  }

  // Cú pháp trong ngoặc vuông: [SP01]
  const bracketMatch = text.match(/\[([A-Za-z0-9_-]{2,20})\]/);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1].toUpperCase();
  }

  // Cú pháp từ khóa: "mã SP01", "sku: AO02", "sp: VAY01"
  const keywordMatch = text.match(/(?:^|[\s,.:;!?-])(?:mã|ma|sku|sp|ms)\s*[:#\-]?\s*([A-Za-z0-9_-]{2,20})/i);
  if (keywordMatch && keywordMatch[1]) {
    return keywordMatch[1].toUpperCase();
  }

  return null;
}

/**
 * Bóc tách các thuộc tính biến thể: màu sắc và kích thước (size)
 * Sử dụng ranh giới tương thích với tiếng Việt có dấu (thay vì \b của ASCII)
 */
export function extractAttributes(text: string): {
  color?: string;
  size?: string;
  variant?: string;
} {
  const result: { color?: string; size?: string; variant?: string } = {};
  if (!text) return result;

  const lower = text.toLowerCase();

  // Bóc tách màu sắc: hỗ trợ ranh giới tiếng Việt
  for (const color of POPULAR_COLORS) {
    const colorRegex = new RegExp(`(?:^|[\\s,.:;!?-])(?:màu\\s+)?(${color})(?=$|[\\s,.:;!?-])`, 'i');
    if (colorRegex.test(lower)) {
      result.color = color;
      break;
    }
  }

  // Bóc tách kích thước (Size)
  for (const size of POPULAR_SIZES) {
    const sizeRegex = new RegExp(`(?:^|[\\s,.:;!?-])(?:size\\s+|sz\\s+)?(${size})(?=$|[\\s,.:;!?-])`, 'i');
    if (sizeRegex.test(lower)) {
      result.size = size.toUpperCase();
      break;
    }
  }

  return result;
}
