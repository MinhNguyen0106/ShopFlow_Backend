/**
 * ShopFlow - User Entity & Types
 * File: backend/src/core/entities/user.entity.ts
 */

export type UserRole = 'owner' | 'admin' | 'staff';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id:            string;
  email:         string;
  password_hash: string;
  full_name:     string;
  role:          UserRole;
  status:        UserStatus;
  created_at:    Date;
  updated_at:    Date;
}

/**
 * Kiểu dữ liệu an toàn của User (đã loại bỏ password_hash khi trả về client)
 */
export type SafeUser = Omit<User, 'password_hash'>;

/**
 * Payload chứa trong JWT Token
 */
export interface JwtUserPayload {
  sub:        string;       // User ID (UUID)
  id?:        string;       // Alias cho sub
  email:      string;
  role:       UserRole;
  token_type: 'access' | 'refresh';
}

/**
 * Cặp Tokens trả về sau khi đăng nhập / đăng ký / refresh
 */
export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    string;
  tokenType:    'Bearer';
}

export interface AuthResponse {
  user:   SafeUser;
  tokens: AuthTokens;
}
