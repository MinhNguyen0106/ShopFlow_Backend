import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken, isEncrypted } from '../crypto.helper.js';
import { AppError } from '../../core/errors/app-error.js';

describe('crypto.helper — AES-256-GCM Token Encryption', () => {
  const sampleToken = 'EAAZA1234567890abcdefghijklmnopqrstuvwxyz_SECRET_PAGE_ACCESS_TOKEN';

  it('nên mã hóa và giải mã thành công token với khóa mặc định', () => {
    const encrypted = encryptToken(sampleToken);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(sampleToken);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(sampleToken);
  });

  it('nên tạo ra các bản mã khác nhau cho cùng một plaintext do IV ngẫu nhiên', () => {
    const enc1 = encryptToken(sampleToken);
    const enc2 = encryptToken(sampleToken);

    expect(enc1).not.toBe(enc2);
    expect(decryptToken(enc1)).toBe(sampleToken);
    expect(decryptToken(enc2)).toBe(sampleToken);
  });

  it('nên mã hóa và giải mã với khóa tùy chỉnh', () => {
    const customKey = 'my_super_secret_custom_encryption_key_123';
    const encrypted = encryptToken(sampleToken, customKey);
    const decrypted = decryptToken(encrypted, customKey);

    expect(decrypted).toBe(sampleToken);
  });

  it('nên throw lỗi khi giải mã bằng sai khóa bí mật', () => {
    const key1 = 'first_secret_key_1234567890123456';
    const key2 = 'second_secret_key_1234567890123456';

    const encrypted = encryptToken(sampleToken, key1);

    expect(() => decryptToken(encrypted, key2)).toThrow(AppError);
  });

  it('nên throw lỗi khi bản mã bị sửa đổi (tampering) do GCM Auth Tag không khớp', () => {
    const encrypted = encryptToken(sampleToken);
    const [ivPart, tagPart, cipherPart] = encrypted.split(':');
    // Tamper the ciphertext
    const validCipher = cipherPart ?? '';
    const tamperedHex = validCipher.slice(0, -2) + (validCipher.endsWith('a') ? 'b' : 'a');
    const tamperedEncrypted = `${ivPart}:${tagPart}:${tamperedHex}`;

    expect(() => decryptToken(tamperedEncrypted)).toThrow(AppError);
  });

  it('nên throw lỗi khi truyền chuỗi rỗng vào encryptToken hoặc decryptToken', () => {
    expect(() => encryptToken('')).toThrow(AppError);
    expect(() => decryptToken('')).toThrow(AppError);
  });

  it('nên throw lỗi khi chuỗi giải mã sai định dạng (không đủ 3 phần)', () => {
    expect(() => decryptToken('invalid_cipher_text_without_colons')).toThrow(AppError);
    expect(() => decryptToken('part1:part2')).toThrow(AppError);
  });

  it('isEncrypted() nên kiểm tra đúng chuỗi đã mã hóa', () => {
    const encrypted = encryptToken(sampleToken);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(isEncrypted('plain_token_12345')).toBe(false);
    expect(isEncrypted('')).toBe(false);
    expect(isEncrypted('a:b:c')).toBe(false);
  });
});
