import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoiceCreationService } from '../services/invoice-creation.service';
import { InvoiceNinjaService } from '../services/invoice-ninja.service';
import { InvoiceRefsRepository } from '../repositories/invoice-refs.repository';
import { SubscriptionService } from '../services/subscription.service';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let invoiceNinjaService: jest.Mocked<
    Pick<InvoiceNinjaService, 'syncCustomerProfile' | 'listInvoices' | 'getInvoiceClientLink'>
  >;
  let invoiceRefsRepository: jest.Mocked<
    Pick<InvoiceRefsRepository, 'findByIdAndSubscriptionId' | 'findOpenOverdueSummaryByUserId' | 'update'>
  >;
  let subscriptionService: jest.Mocked<Pick<SubscriptionService, 'getSubscription'>>;

  const subscriptionId = '11111111-1111-4111-8111-111111111111';
  const invoiceRefId = '22222222-2222-4222-8222-222222222222';
  const userId = 'user-1';
  const reqWithUser = { user: { id: userId, roles: ['user'] } };

  beforeEach(async () => {
    invoiceNinjaService = {
      syncCustomerProfile: jest.fn().mockResolvedValue(undefined),
      listInvoices: jest.fn().mockResolvedValue([]),
      getInvoiceClientLink: jest.fn(),
    };
    invoiceRefsRepository = {
      findByIdAndSubscriptionId: jest.fn(),
      findOpenOverdueSummaryByUserId: jest.fn().mockResolvedValue({ count: 0, totalBalance: 0 }),
      update: jest.fn().mockResolvedValue({}),
    };
    subscriptionService = {
      getSubscription: jest.fn().mockResolvedValue({ id: subscriptionId, userId }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        { provide: InvoiceNinjaService, useValue: invoiceNinjaService },
        { provide: InvoiceCreationService, useValue: {} },
        { provide: InvoiceRefsRepository, useValue: invoiceRefsRepository },
        { provide: SubscriptionService, useValue: subscriptionService },
      ],
    }).compile();

    controller = moduleRef.get(InvoicesController);
  });

  describe('getSummary', () => {
    it('returns openOverdueCount and openOverdueTotal for authenticated user', async () => {
      invoiceRefsRepository.findOpenOverdueSummaryByUserId = jest
        .fn()
        .mockResolvedValue({ count: 3, totalBalance: 150.5 });

      const result = await controller.getSummary(reqWithUser as never);

      expect(result).toEqual({ openOverdueCount: 3, openOverdueTotal: 150.5 });
      expect(invoiceRefsRepository.findOpenOverdueSummaryByUserId).toHaveBeenCalledWith(userId);
    });

    it('throws BadRequestException when user not authenticated', async () => {
      await expect(controller.getSummary({} as never)).rejects.toThrow(BadRequestException);
      expect(invoiceRefsRepository.findOpenOverdueSummaryByUserId).not.toHaveBeenCalled();
    });
  });

  describe('refreshInvoiceLink', () => {
    it('returns new preAuthUrl and updates ref when ref exists and provider returns link', async () => {
      const ref = {
        id: invoiceRefId,
        subscriptionId,
        invoiceNinjaId: 'ninja-1',
        preAuthUrl: 'https://old.example/link',
      };
      const newLink = 'https://new.example/link';
      invoiceRefsRepository.findByIdAndSubscriptionId.mockResolvedValue(ref as never);
      invoiceNinjaService.getInvoiceClientLink.mockResolvedValue(newLink);

      const result = await controller.refreshInvoiceLink(subscriptionId, invoiceRefId, reqWithUser as never);

      expect(result).toEqual({ preAuthUrl: newLink });
      expect(subscriptionService.getSubscription).toHaveBeenCalledWith(subscriptionId, userId);
      expect(invoiceNinjaService.syncCustomerProfile).toHaveBeenCalledWith(userId);
      expect(invoiceRefsRepository.findByIdAndSubscriptionId).toHaveBeenCalledWith(invoiceRefId, subscriptionId);
      expect(invoiceNinjaService.getInvoiceClientLink).toHaveBeenCalledWith('ninja-1');
      expect(invoiceRefsRepository.update).toHaveBeenCalledWith(invoiceRefId, {
        preAuthUrl: newLink,
      });
    });

    it('throws BadRequestException when user not authenticated', async () => {
      await expect(controller.refreshInvoiceLink(subscriptionId, invoiceRefId, {} as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(subscriptionService.getSubscription).not.toHaveBeenCalled();
      expect(invoiceRefsRepository.findByIdAndSubscriptionId).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when subscription does not belong to user', async () => {
      subscriptionService.getSubscription.mockRejectedValue(
        new BadRequestException('Subscription does not belong to user'),
      );

      await expect(controller.refreshInvoiceLink(subscriptionId, invoiceRefId, reqWithUser as never)).rejects.toThrow(
        BadRequestException,
      );

      expect(invoiceRefsRepository.findByIdAndSubscriptionId).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when invoice ref not found', async () => {
      invoiceRefsRepository.findByIdAndSubscriptionId.mockResolvedValue(null);

      await expect(controller.refreshInvoiceLink(subscriptionId, invoiceRefId, reqWithUser as never)).rejects.toThrow(
        NotFoundException,
      );

      expect(invoiceNinjaService.getInvoiceClientLink).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when provider returns no link', async () => {
      const ref = {
        id: invoiceRefId,
        subscriptionId,
        invoiceNinjaId: 'ninja-1',
        preAuthUrl: 'https://old.example/link',
      };
      invoiceRefsRepository.findByIdAndSubscriptionId.mockResolvedValue(ref as never);
      invoiceNinjaService.getInvoiceClientLink.mockResolvedValue(null);

      await expect(controller.refreshInvoiceLink(subscriptionId, invoiceRefId, reqWithUser as never)).rejects.toThrow(
        NotFoundException,
      );

      expect(invoiceRefsRepository.update).not.toHaveBeenCalled();
    });
  });
});
