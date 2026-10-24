/**
 * ShopFlow - Analytics Service (Business Logic & Period-over-Period Calculations)
 * File: backend/src/core/services/analytics.service.ts
 */

import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository.js';
import {
  AnalyticsQueryDto,
  AnalyticsSummaryResponse,
  RevenueSeriesItem,
  ChannelBreakdownItem,
  TopProductItem,
  SalesHeatmapCell,
} from '../../api/dtos/analytics.dto.js';

export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository = new AnalyticsRepository()) {}

  /**
   * Tính toán dải ngày hiện tại và dải ngày kỳ trước (Period-over-Period)
   */
  private resolveDateRanges(query: AnalyticsQueryDto): {
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date;
    previousEnd: Date;
  } {
    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date = now;

    if (query.timeRange === 'custom' && query.startDate && query.endDate) {
      currentStart = new Date(query.startDate);
      currentEnd = new Date(query.endDate);
    } else if (query.timeRange === '30d') {
      currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (query.timeRange === '90d') {
      currentStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      // Mặc định '7d'
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime());
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    return {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    };
  }

  /**
   * Công thức tính tỷ lệ tăng trưởng an toàn phòng vệ chia cho 0
   */
  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const growth = ((current - previous) / previous) * 100;
    return Math.round(growth * 10) / 10;
  }

  /**
   * Lấy tổng quan các chỉ số KPIs kinh doanh kèm so sánh kỳ trước
   */
  async getSummary(query: AnalyticsQueryDto): Promise<AnalyticsSummaryResponse> {
    const { currentStart, currentEnd, previousStart, previousEnd } = this.resolveDateRanges(query);

    const [currentMetrics, prevMetrics] = await Promise.all([
      this.analyticsRepository.getPeriodMetrics(query.pageId, currentStart, currentEnd),
      this.analyticsRepository.getPeriodMetrics(query.pageId, previousStart, previousEnd),
    ]);

    const curRevenue = Number(currentMetrics.total_revenue || 0);
    const prevRevenue = Number(prevMetrics.total_revenue || 0);
    const curOrders = Number(currentMetrics.total_orders || 0);
    const prevOrders = Number(prevMetrics.total_orders || 0);
    const curAov = Number(currentMetrics.average_order_value || 0);
    const prevAov = Number(prevMetrics.average_order_value || 0);

    const curCustomers = Number(currentMetrics.total_customers || 0);
    const prevCustomers = Number(prevMetrics.total_customers || 0);

    const curConversion = curCustomers > 0 ? (curOrders / curCustomers) * 100 : curOrders > 0 ? 100 : 0;
    const prevConversion = prevCustomers > 0 ? (prevOrders / prevCustomers) * 100 : prevOrders > 0 ? 100 : 0;

    return {
      totalRevenue: Math.round(curRevenue),
      revenueGrowthRate: this.calculateGrowthRate(curRevenue, prevRevenue),
      totalOrders: curOrders,
      ordersGrowthRate: this.calculateGrowthRate(curOrders, prevOrders),
      averageOrderValue: Math.round(curAov),
      aovGrowthRate: this.calculateGrowthRate(curAov, prevAov),
      conversionRate: Math.round(curConversion * 10) / 10,
      conversionRateGrowthRate: this.calculateGrowthRate(curConversion, prevConversion),
    };
  }

  /**
   * Lấy chuỗi thời gian doanh thu và số lượng đơn hàng theo ngày
   */
  async getRevenueSeries(query: AnalyticsQueryDto): Promise<RevenueSeriesItem[]> {
    const { currentStart, currentEnd } = this.resolveDateRanges(query);
    const rows = await this.analyticsRepository.getDailyRevenueSeries(
      query.pageId,
      currentStart,
      currentEnd
    );

    return rows.map((r) => ({
      date: r.series_date,
      revenue: Math.round(Number(r.revenue || 0)),
      ordersCount: Number(r.orders_count || 0),
      vietqrRevenue: Math.round(Number(r.vietqr_revenue || 0)),
      codRevenue: Math.round(Number(r.cod_revenue || 0)),
    }));
  }

  /**
   * Lấy phân rã tỷ lệ nguồn đơn hàng (Comment vs Messenger vs Manual)
   */
  async getChannelBreakdown(query: AnalyticsQueryDto): Promise<ChannelBreakdownItem[]> {
    const { currentStart, currentEnd } = this.resolveDateRanges(query);
    const rows = await this.analyticsRepository.getChannelBreakdown(
      query.pageId,
      currentStart,
      currentEnd
    );

    const channelNames: Record<string, string> = {
      facebook_comment: 'Bình luận Fanpage',
      facebook_inbox: 'Hộp thư Messenger',
      manual: 'Tạo đơn thủ công',
    };

    return rows.map((r) => {
      const ordersCount = Number(r.orders_count || 0);
      const successOrders = Number(r.success_orders || 0);
      const cancelledOrders = Number(r.cancelled_orders || 0);

      const successRate = ordersCount > 0 ? Math.round((successOrders / ordersCount) * 1000) / 10 : 0;
      const cancelRate = ordersCount > 0 ? Math.round((cancelledOrders / ordersCount) * 1000) / 10 : 0;

      return {
        channel: (r.source as 'facebook_comment' | 'facebook_inbox' | 'manual') || 'manual',
        channelName: channelNames[r.source] || 'Kênh khác',
        ordersCount,
        revenue: Math.round(Number(r.revenue || 0)),
        successRate,
        cancelRate,
      };
    });
  }

  /**
   * Lấy danh sách Top sản phẩm bán chạy nhất
   */
  async getTopProducts(query: AnalyticsQueryDto, limit: number = 10): Promise<TopProductItem[]> {
    const { currentStart, currentEnd } = this.resolveDateRanges(query);
    const rows = await this.analyticsRepository.getTopSellingProducts(
      query.pageId,
      currentStart,
      currentEnd,
      limit
    );

    const totalRevenueAll = rows.reduce((sum, r) => sum + Number(r.total_revenue || 0), 0);

    return rows.map((r) => {
      const revenue = Math.round(Number(r.total_revenue || 0));
      const percentage =
        totalRevenueAll > 0 ? Math.round((revenue / totalRevenueAll) * 1000) / 10 : 0;

      return {
        productId: r.product_id,
        sku: r.sku,
        productName: r.product_name,
        imageUrl: r.image_url,
        totalQuantitySold: Number(r.total_quantity || 0),
        totalRevenue: revenue,
        revenuePercentage: percentage,
      };
    });
  }

  /**
   * Lấy ma trận nhiệt chốt đơn (24h x 7 ngày, đánh dấu 2 đỉnh giờ vàng)
   */
  async getSalesHeatmap(query: AnalyticsQueryDto): Promise<SalesHeatmapCell[]> {
    const { currentStart, currentEnd } = this.resolveDateRanges(query);
    const rows = await this.analyticsRepository.getSalesHeatmap(
      query.pageId,
      currentStart,
      currentEnd
    );

    // Xây dựng map lookup nhanh theo key `${day}_${hour}`
    const lookup = new Map<string, { orderCount: number; totalAmount: number }>();
    for (const r of rows) {
      const key = `${r.day_of_week}_${r.hour_of_day}`;
      lookup.set(key, {
        orderCount: Number(r.order_count || 0),
        totalAmount: Math.round(Number(r.total_amount || 0)),
      });
    }

    const result: SalesHeatmapCell[] = [];

    // Tạo đầy đủ 7 ngày x 24 giờ
    for (let day = 0; day <= 6; day++) {
      for (let hour = 0; hour <= 23; hour++) {
        const entry = lookup.get(`${day}_${hour}`) || { orderCount: 0, totalAmount: 0 };

        // Đỉnh giờ vàng tương tác tại Việt Nam: 11:00-13:00 và 20:00-22:00
        const isGoldenHour = (hour >= 11 && hour <= 12) || (hour >= 20 && hour <= 21);

        result.push({
          dayOfWeek: day,
          hour,
          orderCount: entry.orderCount,
          totalAmount: entry.totalAmount,
          isGoldenHour,
        });
      }
    }

    return result;
  }
}
