/**
 * ShopFlow - Integration Tests: Analytics Endpoints (/api/v1/analytics)
 * File: backend/src/api/routes/__tests__/analytics.routes.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { analyticsService } from '../../controllers/analytics.controller.js';
import { generateTokens } from '../../../utils/auth.helper.js';
import { User } from '../../../core/entities/user.entity.js';

describe('Analytics Routes Integration (/api/v1/analytics)', () => {
  const app = createApp();

  const testUser: User = {
    id: 'user-uuid-999',
    email: 'analytics-owner@shopflow.vn',
    password_hash: 'hashed',
    full_name: 'Shop Owner',
    role: 'owner',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const { accessToken } = generateTokens(testUser);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Check', () => {
    it('nên trả về 401 Unauthorized khi không có Bearer token', async () => {
      const res = await request(app).get('/api/v1/analytics/summary');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/summary', () => {
    it('nên trả về 200 OK với dữ liệu tổng quan KPIs', async () => {
      vi.spyOn(analyticsService, 'getSummary').mockResolvedValueOnce({
        totalRevenue: 50000000,
        revenueGrowthRate: 15.5,
        totalOrders: 250,
        ordersGrowthRate: 10.2,
        averageOrderValue: 200000,
        aovGrowthRate: 4.8,
        conversionRate: 12.5,
        conversionRateGrowthRate: 2.1,
      });

      const res = await request(app)
        .get('/api/v1/analytics/summary?timeRange=7d')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRevenue).toBe(50000000);
      expect(res.body.data.revenueGrowthRate).toBe(15.5);
    });
  });

  describe('GET /api/v1/analytics/revenue-series', () => {
    it('nên trả về 200 OK với chuỗi thời gian doanh thu ngày', async () => {
      vi.spyOn(analyticsService, 'getRevenueSeries').mockResolvedValueOnce([
        {
          date: '2026-10-24',
          revenue: 12500000,
          ordersCount: 45,
          vietqrRevenue: 8500000,
          codRevenue: 4000000,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/analytics/revenue-series?timeRange=30d')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].revenue).toBe(12500000);
    });
  });

  describe('GET /api/v1/analytics/channel-breakdown', () => {
    it('nên trả về 200 OK với phân rã tỷ lệ nguồn đơn', async () => {
      vi.spyOn(analyticsService, 'getChannelBreakdown').mockResolvedValueOnce([
        {
          channel: 'facebook_comment',
          channelName: 'Bình luận Fanpage',
          ordersCount: 120,
          revenue: 30000000,
          successRate: 92.5,
          cancelRate: 3.5,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/analytics/channel-breakdown?timeRange=7d')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].channel).toBe('facebook_comment');
    });
  });

  describe('GET /api/v1/analytics/top-products', () => {
    it('nên trả về 200 OK với Top 10 sản phẩm bán chạy', async () => {
      vi.spyOn(analyticsService, 'getTopProducts').mockResolvedValueOnce([
        {
          productId: 'prod-uuid-1',
          sku: 'AO-THUN-01',
          productName: 'Áo Thun Trơn Basic',
          imageUrl: 'https://cdn.shopflow.vn/ao.jpg',
          totalQuantitySold: 150,
          totalRevenue: 22500000,
          revenuePercentage: 45.0,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/analytics/top-products?timeRange=7d&limit=10')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].sku).toBe('AO-THUN-01');
    });
  });

  describe('GET /api/v1/analytics/sales-heatmap', () => {
    it('nên trả về 200 OK với ma trận nhiệt 168 khung giờ', async () => {
      vi.spyOn(analyticsService, 'getSalesHeatmap').mockResolvedValueOnce([
        {
          dayOfWeek: 1,
          hour: 12,
          orderCount: 18,
          totalAmount: 5400000,
          isGoldenHour: true,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/analytics/sales-heatmap?timeRange=7d')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].isGoldenHour).toBe(true);
    });
  });
});
