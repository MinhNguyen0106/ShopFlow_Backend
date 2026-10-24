/**
 * ShopFlow - Analytics Routes (TASK-24)
 * File: backend/src/api/routes/analytics.routes.ts
 */

import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate-request.middleware.js';
import { AnalyticsQuerySchema } from '../dtos/analytics.dto.js';

export const analyticsRouter = Router();
const analyticsController = new AnalyticsController();

// Yêu cầu xác thực JWT Bearer token cho toàn bộ các endpoints báo cáo
analyticsRouter.use(authenticateToken);

/**
 * GET /api/v1/analytics/summary - Tổng quan các chỉ số KPIs kinh doanh
 */
analyticsRouter.get(
  '/summary',
  validateRequest({ query: AnalyticsQuerySchema }),
  analyticsController.getSummary
);

/**
 * GET /api/v1/analytics/revenue-series - Chuỗi thời gian doanh thu & đơn hàng theo ngày
 */
analyticsRouter.get(
  '/revenue-series',
  validateRequest({ query: AnalyticsQuerySchema }),
  analyticsController.getRevenueSeries
);

/**
 * GET /api/v1/analytics/channel-breakdown - Phân rã tỷ lệ nguồn đơn hàng
 */
analyticsRouter.get(
  '/channel-breakdown',
  validateRequest({ query: AnalyticsQuerySchema }),
  analyticsController.getChannelBreakdown
);

/**
 * GET /api/v1/analytics/top-products - Top 10 sản phẩm bán chạy nhất
 */
analyticsRouter.get(
  '/top-products',
  validateRequest({ query: AnalyticsQuerySchema }),
  analyticsController.getTopProducts
);

/**
 * GET /api/v1/analytics/sales-heatmap - Ma trận nhiệt chốt đơn (24h x 7 ngày)
 */
analyticsRouter.get(
  '/sales-heatmap',
  validateRequest({ query: AnalyticsQuerySchema }),
  analyticsController.getSalesHeatmap
);
