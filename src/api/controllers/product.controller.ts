/**
 * ShopFlow - Product Controller (TASK-21)
 * File: backend/src/api/controllers/product.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { productService, ProductService } from '../../core/services/product.service.js';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  AdjustStockDto,
} from '../dtos/product.dto.js';

export class ProductController {
  constructor(private readonly service: ProductService = productService) {}

  /**
   * POST /api/v1/products - Tạo sản phẩm mới
   */
  public createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = req.body as CreateProductDto;
      const product = await this.service.createProduct(data);

      res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm mới thành công',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/products - Lấy danh sách sản phẩm theo Fanpage
   */
  public getProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const queryParams = req.query as unknown as QueryProductsDto;
      const result = await this.service.getProducts(queryParams);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/products/:id - Lấy chi tiết sản phẩm
   */
  public getProductById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const product = await this.service.getProductById(id);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/products/:id - Cập nhật sản phẩm
   */
  public updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const data = req.body as UpdateProductDto;
      const updated = await this.service.updateProduct(id, data);

      res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/products/:id - Xóa sản phẩm
   */
  public deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.service.deleteProduct(id);

      res.status(200).json({
        success: true,
        message: 'Xóa sản phẩm thành công',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/products/:id/stock - Điều chỉnh tồn kho sản phẩm
   */
  public adjustStock = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const data = req.body as AdjustStockDto;
      const product = await this.service.adjustStock(id, data);

      res.status(200).json({
        success: true,
        message: 'Điều chỉnh số lượng tồn kho thành công',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const productController = new ProductController();
