/**
 * ShopFlow - Analytics DTOs & Schemas (TASK-24)
 * File: backend/src/api/dtos/analytics.dto.ts
 */

import { z } from 'zod';

export const AnalyticsQuerySchema = z.object({
  pageId: z.string().uuid('pageId phải là UUID hợp lệ').optional(),
  timeRange: z.enum(['7d', '30d', '90d', 'custom']).default('7d'),
  startDate: z.string().datetime({ message: 'startDate phải theo định dạng ISO datetime' }).optional(),
  endDate: z.string().datetime({ message: 'endDate phải theo định dạng ISO datetime' }).optional(),
});

export type AnalyticsQueryDto = z.infer<typeof AnalyticsQuerySchema>;

export interface AnalyticsSummaryResponse {
  totalRevenue: number;
  revenueGrowthRate: number; // Tỷ lệ % tăng trưởng so với kỳ trước
  totalOrders: number;
  ordersGrowthRate: number;
  averageOrderValue: number; // AOV
  aovGrowthRate: number;
  conversionRate: number; // % tỷ lệ chốt đơn thành công từ leads/khách
  conversionRateGrowthRate: number;
}

export interface RevenueSeriesItem {
  date: string; // YYYY-MM-DD
  revenue: number;
  ordersCount: number;
  vietqrRevenue: number;
  codRevenue: number;
}

export interface ChannelBreakdownItem {
  channel: 'facebook_comment' | 'facebook_inbox' | 'manual';
  channelName: string;
  ordersCount: number;
  revenue: number;
  successRate: number; // % hoàn tất / xác nhận
  cancelRate: number; // % hủy
}

export interface TopProductItem {
  productId: string | null;
  sku: string;
  productName: string;
  imageUrl: string | null;
  totalQuantitySold: number;
  totalRevenue: number;
  revenuePercentage: number; // % đóng góp vào tổng doanh thu
}

export interface SalesHeatmapCell {
  dayOfWeek: number; // 0 (CN) đến 6 (T7)
  hour: number; // 0 đến 23
  orderCount: number;
  totalAmount: number;
  isGoldenHour: boolean; // 11:30-13:00 và 20:00-21:30
}
