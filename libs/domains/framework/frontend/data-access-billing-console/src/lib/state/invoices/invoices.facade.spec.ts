import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { clearInvoices, createInvoice, loadInvoices } from './invoices.actions';
import { InvoicesFacade } from './invoices.facade';
import type { CreateInvoiceDto, InvoiceResponse } from '../../types/billing.types';

describe('InvoicesFacade', () => {
  let facade: InvoicesFacade;
  let store: jest.Mocked<Store>;

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

    TestBed.configureTestingModule({
      providers: [InvoicesFacade, { provide: Store, useValue: store }],
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
  });
});
