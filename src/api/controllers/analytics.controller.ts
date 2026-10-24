/**
 * ShopFlow - Analytics Controller (TASK-24)
 * File: backend/src/api/controllers/analytics.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../../core/services/analytics.service.js';
import { AnalyticsQueryDto } from '../dtos/analytics.dto.js';

export const analyticsService = new AnalyticsService();

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService = analyticsService) {}

  /**
   * GET /api/v1/analytics/summary
   */
  public getSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as AnalyticsQueryDto;
      const data = await this.service.getSummary(query);

      res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu tổng quan KPIs thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/revenue-series
   */
  public getRevenueSeries = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as AnalyticsQueryDto;
      const data = await this.service.getRevenueSeries(query);

      res.status(200).json({
        success: true,
        message: 'Lấy chuỗi dữ liệu doanh thu theo ngày thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/channel-breakdown
   */
  public getChannelBreakdown = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as AnalyticsQueryDto;
      const data = await this.service.getChannelBreakdown(query);

      res.status(200).json({
        success: true,
        message: 'Lấy phân rã tỷ lệ nguồn đơn thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/top-products
   */
  public getTopProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as AnalyticsQueryDto;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const data = await this.service.getTopProducts(query, limit);

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách Top sản phẩm bán chạy thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/analytics/sales-heatmap
   */
  public getSalesHeatmap = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query as unknown as AnalyticsQueryDto;
      const data = await this.service.getSalesHeatmap(query);

      res.status(200).json({
        success: true,
        message: 'Lấy ma trận nhiệt khung giờ chốt đơn thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
