/**
 * ShopFlow - Integration Tests: Media Routes
 * File: backend/src/api/routes/__tests__/media.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { mediaService } from '../../../core/services/media.service.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { User } from '../../../core/entities/user.entity.js';

describe('Media Routes Integration (/api/v1/media/upload)', () => {
  const app = createApp();

  const testUser: User = {
    id: 'user-uuid-media-test',
    email: 'creator@shopflow.vn',
    password_hash: 'hashed',
    full_name: 'Content Creator',
    role: 'owner',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const { accessToken } = generateTokens(testUser);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('nên trả về 401 UNAUTHORIZED khi không có Bearer token', async () => {
    const res = await request(app)
      .post('/api/v1/media/upload')
      .attach('file', Buffer.from('fake image'), 'test.jpg');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('nên trả về 400 MISSING_FILE khi không gửi kèm tệp tin', async () => {
    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_FILE');
  });

  it('nên trả về 400 UNSUPPORTED_MEDIA_TYPE khi tệp tin sai định dạng MIME', async () => {
    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('hello plain text'), 'notes.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('nên trả về 201 Created cùng secure_url khi tải lên hình ảnh hợp lệ', async () => {
    vi.spyOn(mediaService, 'uploadMedia').mockResolvedValueOnce({
      url: 'https://res.cloudinary.com/shopflow/image/upload/v1/shopflow/posts/mock_image.jpg',
      public_id: 'shopflow/posts/mock_image',
      resource_type: 'image',
      format: 'jpg',
      bytes: 1024,
      width: 800,
      height: 600,
    });

    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('fake jpg binary content'), {
        filename: 'sanpham.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toContain('https://res.cloudinary.com');
    expect(res.body.data.public_id).toBe('shopflow/posts/mock_image');
    expect(res.body.data.resource_type).toBe('image');
  });
});
