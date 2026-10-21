/**
 * ShopFlow - Unit Tests: scheduled-post.worker.ts
 * File: backend/src/infrastructure/queue/__tests__/scheduled-post.worker.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Job } from 'bullmq';
import { ScheduledPostWorkerService } from '../scheduled-post.worker.js';
import {
  PostScheduleRepository,
  PostSchedule,
} from '../../repositories/post-schedule.repository.js';
import { ConnectedPageRepository } from '../../repositories/connected-page.repository.js';
import { MetaGraphApiClient } from '../../meta/graph-api.client.js';
import * as cryptoHelper from '../../../utils/crypto.helper.js';

describe('ScheduledPostWorkerService Unit Tests', () => {
  let workerService: ScheduledPostWorkerService;
  let mockPostRepo: PostScheduleRepository;
  let mockPageRepo: ConnectedPageRepository;
  let mockGraphClient: MetaGraphApiClient;

  const mockPost: PostSchedule = {
    id: 'post-uuid-123',
    page_id: 'page-db-uuid-1',
    user_id: 'user-uuid-1',
    content_text: 'Bài viết ra mắt bộ sưu tập mới',
    media_type: 'none',
    media_urls: [],
    scheduled_time: new Date(),
    status: 'scheduled',
    meta_post_id: null,
    error_message: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPage = {
    id: 'page-db-uuid-1',
    user_id: 'user-uuid-1',
    page_id: 'meta-page-fb-456',
    page_name: 'Shop Thời Trang Mùa Hè',
    page_access_token: 'aes_encrypted_token',
    is_active: true,
    webhook_subscribed: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockJob = {
    data: {
      postId: 'post-uuid-123',
      pageId: 'page-db-uuid-1',
      userId: 'user-uuid-1',
    },
  } as Job;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockPostRepo = {
      findById: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as PostScheduleRepository;

    mockPageRepo = {
      findById: vi.fn(),
    } as unknown as ConnectedPageRepository;

    mockGraphClient = {
      publishFeedPost: vi.fn(),
      publishPhotoPost: vi.fn(),
      publishVideoPost: vi.fn(),
      uploadUnpublishedPhoto: vi.fn(),
      publishAlbumPost: vi.fn(),
    } as unknown as MetaGraphApiClient;

    vi.spyOn(cryptoHelper, 'decryptToken').mockReturnValue('decrypted_access_token');

    workerService = new ScheduledPostWorkerService(
      mockPostRepo,
      mockPageRepo,
      mockGraphClient
    );
  });

  it('bỏ qua khi bài viết không tồn tại trong DB', async () => {
    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(null);

    await workerService.processJob(mockJob);

    expect(mockPageRepo.findById).not.toHaveBeenCalled();
    expect(mockGraphClient.publishFeedPost).not.toHaveBeenCalled();
  });

  it('bỏ qua khi bài viết đã ở trạng thái cancelled hoặc published', async () => {
    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce({
      ...mockPost,
      status: 'cancelled',
    });

    await workerService.processJob(mockJob);
    expect(mockGraphClient.publishFeedPost).not.toHaveBeenCalled();
  });

  it('đánh dấu failed khi Fanpage liên kết không tồn tại', async () => {
    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(mockPost);
    vi.spyOn(mockPageRepo, 'findById').mockResolvedValueOnce(null);

    await workerService.processJob(mockJob);

    expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
      mockPost.id,
      'failed',
      null,
      expect.stringContaining('không tồn tại')
    );
  });

  it('đánh dấu failed khi Fanpage đang bị tạm dừng kết nối', async () => {
    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(mockPost);
    vi.spyOn(mockPageRepo, 'findById').mockResolvedValueOnce({
      ...mockPage,
      is_active: false,
    });

    await workerService.processJob(mockJob);

    expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
      mockPost.id,
      'failed',
      null,
      expect.stringContaining('tạm dừng')
    );
  });

  it('đánh dấu failed khi giải mã token Fanpage thất bại', async () => {
    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(mockPost);
    vi.spyOn(mockPageRepo, 'findById').mockResolvedValueOnce(mockPage);
    vi.spyOn(cryptoHelper, 'decryptToken').mockImplementationOnce(() => {
      throw new Error('Invalid key length');
    });

    await workerService.processJob(mockJob);

    expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
      mockPost.id,
      'failed',
      null,
      expect.stringContaining('Giải mã token')
    );
  });

  it('xuất bản bài viết dạng văn bản thuần (Text-only) thành công', async () => {
    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(mockPost);
    vi.spyOn(mockPageRepo, 'findById').mockResolvedValueOnce(mockPage);
    vi.spyOn(mockGraphClient, 'publishFeedPost').mockResolvedValueOnce({
      success: true,
      postId: 'meta_post_feed_999',
    });

    await workerService.processJob(mockJob);

    expect(mockGraphClient.publishFeedPost).toHaveBeenCalledWith(
      mockPage.page_id,
      mockPost.content_text,
      'decrypted_access_token'
    );
    expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
      mockPost.id,
      'published',
      'meta_post_feed_999',
      null
    );
  });

  it('xuất bản bài viết kèm 1 hình ảnh thành công', async () => {
    const photoPost: PostSchedule = {
      ...mockPost,
      media_type: 'photo',
      media_urls: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
    };

    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(photoPost);
    vi.spyOn(mockPageRepo, 'findById').mockResolvedValueOnce(mockPage);
    vi.spyOn(mockGraphClient, 'publishPhotoPost').mockResolvedValueOnce({
      success: true,
      postId: 'meta_post_photo_111',
    });

    await workerService.processJob(mockJob);

    expect(mockGraphClient.publishPhotoPost).toHaveBeenCalledWith(
      mockPage.page_id,
      photoPost.media_urls[0],
      photoPost.content_text,
      'decrypted_access_token'
    );
    expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
      mockPost.id,
      'published',
      'meta_post_photo_111',
      null
    );
  });

  it('xuất bản bài viết kèm video thành công', async () => {
    const videoPost: PostSchedule = {
      ...mockPost,
      media_type: 'video',
      media_urls: ['https://res.cloudinary.com/demo/video/upload/sample.mp4'],
    };

    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(videoPost);
    vi.spyOn(mockPageRepo, 'findById').mockResolvedValueOnce(mockPage);
    vi.spyOn(mockGraphClient, 'publishVideoPost').mockResolvedValueOnce({
      success: true,
      postId: 'meta_post_video_222',
    });

    await workerService.processJob(mockJob);

    expect(mockGraphClient.publishVideoPost).toHaveBeenCalledWith(
      mockPage.page_id,
      videoPost.media_urls[0],
      videoPost.content_text,
      'decrypted_access_token'
    );
    expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
      mockPost.id,
      'published',
      'meta_post_video_222',
      null
    );
  });

  it('xuất bản bài viết Album (nhiều ảnh) thành công', async () => {
    const albumPost: PostSchedule = {
      ...mockPost,
      media_type: 'photo',
      media_urls: [
        'https://res.cloudinary.com/demo/image/upload/sample1.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      ],
    };

    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(albumPost);
    vi.spyOn(mockPageRepo, 'findById').mockResolvedValueOnce(mockPage);
    vi.spyOn(mockGraphClient, 'uploadUnpublishedPhoto')
      .mockResolvedValueOnce({ success: true, mediaFbid: 'fbid_1' })
      .mockResolvedValueOnce({ success: true, mediaFbid: 'fbid_2' });
    vi.spyOn(mockGraphClient, 'publishAlbumPost').mockResolvedValueOnce({
      success: true,
      postId: 'meta_album_post_333',
    });

    await workerService.processJob(mockJob);

    expect(mockGraphClient.uploadUnpublishedPhoto).toHaveBeenCalledTimes(2);
    expect(mockGraphClient.publishAlbumPost).toHaveBeenCalledWith(
      mockPage.page_id,
      ['fbid_1', 'fbid_2'],
      albumPost.content_text,
      'decrypted_access_token'
    );
    expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
      mockPost.id,
      'published',
      'meta_album_post_333',
      null
    );
  });

  it('đánh dấu failed khi Meta API trả về lỗi', async () => {
    vi.spyOn(mockPostRepo, 'findById').mockResolvedValueOnce(mockPost);
    vi.spyOn(mockPageRepo, 'findById').mockResolvedValueOnce(mockPage);
    vi.spyOn(mockGraphClient, 'publishFeedPost').mockResolvedValueOnce({
      success: false,
      error: 'Invalid OAuth 2.0 token',
    });

    await workerService.processJob(mockJob);

    expect(mockPostRepo.updateStatus).toHaveBeenCalledWith(
      mockPost.id,
      'failed',
      null,
      'Invalid OAuth 2.0 token'
    );
  });
});
