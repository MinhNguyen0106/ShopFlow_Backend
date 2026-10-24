/**
 * ShopFlow - Analytics Service Unit Tests (TASK-24)
 * File: backend/src/core/services/__tests__/analytics.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../analytics.service.js';
import { AnalyticsRepository } from '../../../infrastructure/repositories/analytics.repository.js';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockRepo: {
    getPeriodMetrics: ReturnType<typeof vi.fn>;
    getDailyRevenueSeries: ReturnType<typeof vi.fn>;
    getChannelBreakdown: ReturnType<typeof vi.fn>;
    getTopSellingProducts: ReturnType<typeof vi.fn>;
    getSalesHeatmap: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepo = {
      getPeriodMetrics: vi.fn(),
      getDailyRevenueSeries: vi.fn(),
      getChannelBreakdown: vi.fn(),
      getTopSellingProducts: vi.fn(),
      getSalesHeatmap: vi.fn(),
    };

    service = new AnalyticsService(mockRepo as unknown as AnalyticsRepository);
  });

  describe('getSummary', () => {
    it('tính toán chính xác doanh thu, số đơn, AOV và tỷ lệ tăng trưởng growthRate', async () => {
      // Current: 20tr, 100 đơn, 200k AOV, 80 khách
      mockRepo.getPeriodMetrics.mockResolvedValueOnce({
        total_revenue: '20000000',
        total_orders: '100',
        completed_orders: '85',
        cancelled_orders: '5',
        average_order_value: '200000',
        total_customers: '80',
      });

      // Previous: 10tr, 50 đơn, 200k AOV, 50 khách
      mockRepo.getPeriodMetrics.mockResolvedValueOnce({
        total_revenue: '10000000',
        total_orders: '50',
        completed_orders: '40',
        cancelled_orders: '3',
        average_order_value: '200000',
        total_customers: '50',
      });

      const res = await service.getSummary({ timeRange: '7d' });

      expect(res.totalRevenue).toBe(20000000);
      expect(res.revenueGrowthRate).toBe(100); // Tăng 100%
      expect(res.totalOrders).toBe(100);
      expect(res.ordersGrowthRate).toBe(100);
      expect(res.averageOrderValue).toBe(200000);
      expect(res.aovGrowthRate).toBe(0);
      expect(res.conversionRate).toBeGreaterThan(0);
    });

    it('phòng vệ an toàn chia cho 0 khi kỳ trước doanh thu bằng 0', async () => {
      mockRepo.getPeriodMetrics.mockResolvedValueOnce({
        total_revenue: '5000000',
        total_orders: '25',
        completed_orders: '20',
        cancelled_orders: '1',
        average_order_value: '200000',
        total_customers: '20',
      });

      mockRepo.getPeriodMetrics.mockResolvedValueOnce({
        total_revenue: '0',
        total_orders: '0',
        completed_orders: '0',
        cancelled_orders: '0',
        average_order_value: '0',
        total_customers: '0',
      });

      const res = await service.getSummary({ timeRange: '30d' });

      expect(res.totalRevenue).toBe(5000000);
      expect(res.revenueGrowthRate).toBe(100);
      expect(res.ordersGrowthRate).toBe(100);
      expect(res.aovGrowthRate).toBe(100);
    });

    it('hỗ trợ timeRange custom với ngày bắt đầu và kết thúc', async () => {
      mockRepo.getPeriodMetrics.mockResolvedValue({
        total_revenue: '1000000',
        total_orders: '5',
        completed_orders: '5',
        cancelled_orders: '0',
        average_order_value: '200000',
        total_customers: '5',
      });

      const res = await service.getSummary({
        timeRange: 'custom',
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-10T23:59:59.000Z',
      });

      expect(res.totalRevenue).toBe(1000000);
      expect(mockRepo.getPeriodMetrics).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRevenueSeries', () => {
    it('ánh xạ chính xác các điểm dữ liệu doanh thu ngày và phương thức thanh toán', async () => {
      mockRepo.getDailyRevenueSeries.mockResolvedValueOnce([
        {
          series_date: '2026-10-20',
          revenue: '2500000',
          orders_count: '10',
          vietqr_revenue: '1500000',
          cod_revenue: '1000000',
        },
        {
          series_date: '2026-10-21',
          revenue: '4000000',
          orders_count: '15',
          vietqr_revenue: '3000000',
          cod_revenue: '1000000',
        },
      ]);

      const res = await service.getRevenueSeries({ timeRange: '7d' });

      expect(res).toHaveLength(2);
      expect(res[0]?.date).toBe('2026-10-20');
      expect(res[0]?.revenue).toBe(2500000);
      expect(res[0]?.vietqrRevenue).toBe(1500000);
      expect(res[0]?.codRevenue).toBe(1000000);
      expect(res[1]?.revenue).toBe(4000000);
    });
  });

  describe('getChannelBreakdown', () => {
    it('tính toán tỷ lệ chuyển đổi và tên kênh tiếng Việt', async () => {
      mockRepo.getChannelBreakdown.mockResolvedValueOnce([
        {
          source: 'facebook_comment',
          orders_count: '50',
          revenue: '15000000',
          success_orders: '45',
          cancelled_orders: '2',
        },
        {
          source: 'facebook_inbox',
          orders_count: '30',
          revenue: '10000000',
          success_orders: '28',
          cancelled_orders: '1',
        },
      ]);

      const res = await service.getChannelBreakdown({ timeRange: '7d' });

      expect(res).toHaveLength(2);
      expect(res[0]?.channel).toBe('facebook_comment');
      expect(res[0]?.channelName).toBe('Bình luận Fanpage');
      expect(res[0]?.successRate).toBe(90); // 45 / 50 * 100
      expect(res[0]?.cancelRate).toBe(4); // 2 / 50 * 100
      expect(res[1]?.channelName).toBe('Hộp thư Messenger');
    });
  });

  describe('getTopProducts', () => {
    it('tính toán tỷ trọng phần trăm doanh thu đóng góp của từng sản phẩm', async () => {
      mockRepo.getTopSellingProducts.mockResolvedValueOnce([
        {
          product_id: 'p-1',
          sku: 'A01',
          product_name: 'Áo Thun',
          image_url: 'https://img.com/a.jpg',
          total_quantity: '20',
          total_revenue: '6000000',
        },
        {
          product_id: 'p-2',
          sku: 'Q01',
          product_name: 'Quần Jeans',
          image_url: null,
          total_quantity: '10',
          total_revenue: '4000000',
        },
      ]);

      const res = await service.getTopProducts({ timeRange: '7d' }, 10);

      expect(res).toHaveLength(2);
      expect(res[0]?.sku).toBe('A01');
      expect(res[0]?.revenuePercentage).toBe(60); // 6tr / 10tr = 60%
      expect(res[1]?.sku).toBe('Q01');
      expect(res[1]?.revenuePercentage).toBe(40); // 4tr / 10tr = 40%
    });
  });

  describe('getSalesHeatmap', () => {
    it('trả về đủ 168 ô (7 ngày x 24 giờ) và đánh dấu chính xác khung giờ vàng', async () => {
      mockRepo.getSalesHeatmap.mockResolvedValueOnce([
        {
          day_of_week: 1, // Thứ 2
          hour_of_day: 12, // 12h trưa
          order_count: 15,
          total_amount: 4500000,
        },
      ]);

      const res = await service.getSalesHeatmap({ timeRange: '7d' });

      expect(res).toHaveLength(168); // 7 * 24

      // Tìm cell Thứ 2, 12h
      const cell = res.find((c) => c.dayOfWeek === 1 && c.hour === 12);
      expect(cell).toBeDefined();
      expect(cell?.orderCount).toBe(15);
      expect(cell?.totalAmount).toBe(4500000);
      expect(cell?.isGoldenHour).toBe(true);

      // Cell 3h sáng không phải giờ vàng
      const nightCell = res.find((c) => c.dayOfWeek === 1 && c.hour === 3);
      expect(nightCell?.isGoldenHour).toBe(false);
      expect(nightCell?.orderCount).toBe(0);
    });
  });
});
