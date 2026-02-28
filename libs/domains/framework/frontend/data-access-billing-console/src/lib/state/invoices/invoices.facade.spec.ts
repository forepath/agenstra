import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import {
  clearInvoices,
  createInvoice,
  loadInvoices,
  loadInvoicesSummary as loadInvoicesSummaryAction,
  refreshInvoiceLink as refreshInvoiceLinkAction,
  refreshInvoiceLinkFailure,
  refreshInvoiceLinkSuccess,
} from './invoices.actions';
import { InvoicesFacade } from './invoices.facade';
import type { CreateInvoiceDto, InvoiceResponse } from '../../types/billing.types';
import { InvoicesService } from '../../services/invoices.service';

describe('InvoicesFacade', () => {
  let facade: InvoicesFacade;
  let store: jest.Mocked<Store>;
  let invoicesService: jest.Mocked<Pick<InvoicesService, 'refreshInvoiceLink'>>;

  const subscriptionId = 'sub-1';
  const mockInvoice: InvoiceResponse = {
    id: 'inv-1',
    subscriptionId: 'sub-1',
    invoiceNinjaId: 'ninja-1',
    preAuthUrl: 'https://example.com/auth',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    store = { select: jest.fn(), dispatch: jest.fn() } as never;
    invoicesService = {
      refreshInvoiceLink: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        InvoicesFacade,
        { provide: Store, useValue: store },
        { provide: InvoicesService, useValue: invoicesService },
      ],
    });

    facade = TestBed.inject(InvoicesFacade);
  });

  describe('State Observables', () => {
    it('should return invoices by subscription id observable', (done) => {
      store.select.mockReturnValue(of([mockInvoice]));
      facade.getInvoicesBySubscriptionId$(subscriptionId).subscribe((result) => {
        expect(result).toEqual([mockInvoice]);
        done();
      });
    });

    it('should return loading observable', (done) => {
      store.select.mockReturnValue(of(true));
      facade.getInvoicesLoading$().subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('should return error observable', (done) => {
      store.select.mockReturnValue(of('Test error'));
      facade.getInvoicesError$().subscribe((result) => {
        expect(result).toBe('Test error');
        done();
      });
    });

    it('should return refreshingInvoiceRefId observable', (done) => {
      store.select.mockReturnValue(of('ref-1'));
      facade.getRefreshingInvoiceRefId$().subscribe((result) => {
        expect(result).toBe('ref-1');
        done();
      });
    });

    it('should return invoices summary observable', (done) => {
      const summary = { openOverdueCount: 2, openOverdueTotal: 100, billingDayOfMonth: 10, unbilledTotal: 25 };
      store.select.mockReturnValue(of(summary));
      facade.getInvoicesSummary$().subscribe((result) => {
        expect(result).toEqual(summary);
        done();
      });
    });
  });

  describe('Action Methods', () => {
    it('should dispatch loadInvoices', () => {
      facade.loadInvoices(subscriptionId);
      expect(store.dispatch).toHaveBeenCalledWith(loadInvoices({ subscriptionId }));
    });

    it('should dispatch createInvoice', () => {
      const dto: CreateInvoiceDto = { description: 'Test' };
      facade.createInvoice(subscriptionId, dto);
      expect(store.dispatch).toHaveBeenCalledWith(createInvoice({ subscriptionId, dto }));
    });

    it('should dispatch clearInvoices', () => {
      facade.clearInvoices();
      expect(store.dispatch).toHaveBeenCalledWith(clearInvoices());
    });

    it('should dispatch loadInvoicesSummary', () => {
      facade.loadInvoicesSummary();
      expect(store.dispatch).toHaveBeenCalledWith(loadInvoicesSummaryAction());
    });

    it('refreshInvoiceLink should dispatch request then success and return preAuthUrl', (done) => {
      const invoiceRefId = 'ref-1';
      const preAuthUrl = 'https://example.com/new-link';
      invoicesService.refreshInvoiceLink.mockReturnValue(of({ preAuthUrl }));

      facade.refreshInvoiceLink(subscriptionId, invoiceRefId).subscribe({
        next: (url) => {
          expect(url).toBe(preAuthUrl);
          expect(store.dispatch).toHaveBeenCalledWith(refreshInvoiceLinkAction({ subscriptionId, invoiceRefId }));
          expect(store.dispatch).toHaveBeenCalledWith(
            refreshInvoiceLinkSuccess({ subscriptionId, invoiceRefId, preAuthUrl }),
          );
          done();
        },
      });
    });

    it('refreshInvoiceLink should dispatch failure on error', (done) => {
      const invoiceRefId = 'ref-1';
      invoicesService.refreshInvoiceLink.mockReturnValue(throwError(() => ({ message: 'Network error' })));

      facade.refreshInvoiceLink(subscriptionId, invoiceRefId).subscribe({
        error: () => {
          expect(store.dispatch).toHaveBeenCalledWith(refreshInvoiceLinkFailure({ error: 'Network error' }));
          done();
        },
      });
    });
  });
});
