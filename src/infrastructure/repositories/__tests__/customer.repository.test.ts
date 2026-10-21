/**
 * ShopFlow - Unit Tests: customer.repository.ts
 * File: backend/src/infrastructure/repositories/__tests__/customer.repository.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerRepository, Customer } from '../customer.repository.js';
import * as dbClient from '../../database/db.client.js';

vi.mock('../../database/db.client.js', () => ({
  query: vi.fn(),
}));

describe('CustomerRepository', () => {
  let repo: CustomerRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CustomerRepository();
  });

  describe('upsertWithPhone()', () => {
    it('nên chèn/cập nhật thông tin khách hàng kèm nhãn Co_SDT', async () => {
      const mockCustomer: Customer = {
        id: 'cust-uuid-1',
        page_id: 'page-uuid-1',
        customer_fb_id: 'fb-user-123',
        customer_name: 'Nguyễn Văn A',
        phone_number: '0981234567',
        address: null,
        tags: ['Co_SDT'],
        notes: null,
        last_interaction_at: new Date(),
        created_at: new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockCustomer],
        rowCount: 1,
        command: 'INSERT',
      });

      const result = await repo.upsertWithPhone(
        'page-uuid-1',
        'fb-user-123',
        'Nguyễn Văn A',
        '0981234567',
        'Co_SDT'
      );

      expect(result).toEqual(mockCustomer);
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        expect.arrayContaining(['page-uuid-1', 'fb-user-123', 'Nguyễn Văn A', '0981234567', 'Co_SDT'])
      );
    });
  });

  describe('findByFbId()', () => {
    it('nên tìm thấy khách hàng theo page_id và customer_fb_id', async () => {
      const mockCustomer: Customer = {
        id: 'cust-uuid-1',
        page_id: 'page-uuid-1',
        customer_fb_id: 'fb-user-123',
        customer_name: 'Nguyễn Văn A',
        phone_number: '0981234567',
        address: null,
        tags: ['Co_SDT'],
        notes: null,
        last_interaction_at: new Date(),
        created_at: new Date(),
      };

      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [mockCustomer],
        rowCount: 1,
        command: 'SELECT',
      });

      const result = await repo.findByFbId('page-uuid-1', 'fb-user-123');
      expect(result).toEqual(mockCustomer);
    });

    it('nên trả về null nếu không tìm thấy khách hàng', async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
      });

      const result = await repo.findByFbId('page-uuid-1', 'fb-user-not-found');
      expect(result).toBeNull();
    });
  });
});
