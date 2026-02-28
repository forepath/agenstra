import {
  clearInvoices,
  createInvoice,
  createInvoiceFailure,
  createInvoiceSuccess,
  loadInvoices,
  loadInvoicesFailure,
  loadInvoicesSuccess,
  loadInvoicesSummary,
  loadInvoicesSummaryFailure,
  loadInvoicesSummarySuccess,
  loadOpenOverdueInvoices,
  loadOpenOverdueInvoicesFailure,
  loadOpenOverdueInvoicesSuccess,
  refreshInvoiceLink,
  refreshInvoiceLinkFailure,
  refreshInvoiceLinkSuccess,
} from './invoices.actions';
import { invoicesReducer, initialInvoicesState, type InvoicesState } from './invoices.reducer';
import type { InvoiceResponse } from '../../types/billing.types';

describe('invoicesReducer', () => {
  const subscriptionId = 'sub-1';
  const mockInvoice: InvoiceResponse = {
    id: 'inv-1',
    subscriptionId: 'sub-1',
    invoiceNinjaId: 'ninja-1',
    preAuthUrl: 'https://example.com/auth',
    status: 'draft',
    createdAt: '2024-01-01T00:00:00Z',
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' };
      expect(invoicesReducer(undefined, action as never)).toEqual(initialInvoicesState);
    });
  });

  describe('loadInvoices', () => {
    it('should set loading to true and clear error', () => {
      const state: InvoicesState = {
        ...initialInvoicesState,
        error: 'Previous error',
      };
      const newState = invoicesReducer(state, loadInvoices({ subscriptionId }));
      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('loadInvoicesSuccess', () => {
    it('should set invoices for subscription and set loading to false', () => {
      const state: InvoicesState = {
        ...initialInvoicesState,
        loading: true,
      };
      const invoices = [mockInvoice];
      const newState = invoicesReducer(state, loadInvoicesSuccess({ subscriptionId, invoices }));
      expect(newState.entities[subscriptionId]).toEqual(invoices);
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
    });

    it('should merge entities for different subscriptions', () => {
      const state: InvoicesState = {
        ...initialInvoicesState,
        entities: { 'sub-other': [mockInvoice] },
      };
      const newState = invoicesReducer(state, loadInvoicesSuccess({ subscriptionId, invoices: [mockInvoice] }));
      expect(newState.entities['sub-other']).toEqual([mockInvoice]);
      expect(newState.entities[subscriptionId]).toEqual([mockInvoice]);
    });
  });

  describe('loadInvoicesFailure', () => {
    it('should set error and set loading to false', () => {
      const state: InvoicesState = { ...initialInvoicesState, loading: true };
      const newState = invoicesReducer(state, loadInvoicesFailure({ error: 'Load failed' }));
      expect(newState.error).toBe('Load failed');
      expect(newState.loading).toBe(false);
    });
  });

  describe('createInvoice', () => {
    it('should set creating to true and clear error', () => {
      const state: InvoicesState = { ...initialInvoicesState, error: 'Previous error' };
      const newState = invoicesReducer(state, createInvoice({ subscriptionId }));
      expect(newState.creating).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('createInvoiceSuccess', () => {
    it('should set creating to false and clear error', () => {
      const state: InvoicesState = { ...initialInvoicesState, creating: true };
      const newState = invoicesReducer(
        state,
        createInvoiceSuccess({
          subscriptionId,
          response: { invoiceId: 'inv-1', preAuthUrl: 'https://example.com' },
        }),
      );
      expect(newState.creating).toBe(false);
      expect(newState.error).toBeNull();
    });
  });

  describe('createInvoiceFailure', () => {
    it('should set error and set creating to false', () => {
      const state: InvoicesState = { ...initialInvoicesState, creating: true };
      const newState = invoicesReducer(state, createInvoiceFailure({ error: 'Create failed' }));
      expect(newState.error).toBe('Create failed');
      expect(newState.creating).toBe(false);
    });
  });

  describe('loadInvoicesSummary', () => {
    it('should set summaryLoading to true and clear summaryError', () => {
      const state: InvoicesState = { ...initialInvoicesState, summaryError: 'Previous error' };
      const newState = invoicesReducer(state, loadInvoicesSummary());
      expect(newState.summaryLoading).toBe(true);
      expect(newState.summaryError).toBeNull();
    });
  });

  describe('loadInvoicesSummarySuccess', () => {
    it('should set summary and clear summaryLoading', () => {
      const state: InvoicesState = { ...initialInvoicesState, summaryLoading: true };
      const summary = { openOverdueCount: 3, openOverdueTotal: 200, billingDayOfMonth: 15, unbilledTotal: 50 };
      const newState = invoicesReducer(state, loadInvoicesSummarySuccess({ summary }));
      expect(newState.summary).toEqual(summary);
      expect(newState.summaryLoading).toBe(false);
      expect(newState.summaryError).toBeNull();
    });
  });

  describe('loadInvoicesSummaryFailure', () => {
    it('should set summaryError and clear summaryLoading', () => {
      const state: InvoicesState = { ...initialInvoicesState, summaryLoading: true };
      const newState = invoicesReducer(state, loadInvoicesSummaryFailure({ error: 'Summary failed' }));
      expect(newState.summaryLoading).toBe(false);
      expect(newState.summaryError).toBe('Summary failed');
    });
  });

  describe('loadOpenOverdueInvoices', () => {
    it('should set openOverdueListLoading to true and clear openOverdueListError', () => {
      const state: InvoicesState = { ...initialInvoicesState, openOverdueListError: 'Previous error' };
      const newState = invoicesReducer(state, loadOpenOverdueInvoices());
      expect(newState.openOverdueListLoading).toBe(true);
      expect(newState.openOverdueListError).toBeNull();
    });
  });

  describe('loadOpenOverdueInvoicesSuccess', () => {
    it('should set openOverdueList and clear loading', () => {
      const state: InvoicesState = { ...initialInvoicesState, openOverdueListLoading: true };
      const invoices = [mockInvoice];
      const newState = invoicesReducer(state, loadOpenOverdueInvoicesSuccess({ invoices }));
      expect(newState.openOverdueList).toEqual(invoices);
      expect(newState.openOverdueListLoading).toBe(false);
      expect(newState.openOverdueListError).toBeNull();
    });
  });

  describe('loadOpenOverdueInvoicesFailure', () => {
    it('should set openOverdueListError and clear loading', () => {
      const state: InvoicesState = { ...initialInvoicesState, openOverdueListLoading: true };
      const newState = invoicesReducer(state, loadOpenOverdueInvoicesFailure({ error: 'Open overdue load failed' }));
      expect(newState.openOverdueListLoading).toBe(false);
      expect(newState.openOverdueListError).toBe('Open overdue load failed');
    });
  });

  describe('refreshInvoiceLink', () => {
    it('should set refreshingInvoiceRefId and clear error', () => {
      const state: InvoicesState = { ...initialInvoicesState, error: 'Previous error' };
      const newState = invoicesReducer(state, refreshInvoiceLink({ subscriptionId, invoiceRefId: 'ref-1' }));
      expect(newState.refreshingInvoiceRefId).toBe('ref-1');
      expect(newState.error).toBeNull();
    });
  });

  describe('refreshInvoiceLinkSuccess', () => {
    it('should update invoice preAuthUrl and clear refreshingInvoiceRefId', () => {
      const state: InvoicesState = {
        ...initialInvoicesState,
        entities: { [subscriptionId]: [mockInvoice] },
        refreshingInvoiceRefId: 'inv-1',
      };
      const newState = invoicesReducer(
        state,
        refreshInvoiceLinkSuccess({
          subscriptionId,
          invoiceRefId: 'inv-1',
          preAuthUrl: 'https://example.com/new-link',
        }),
      );
      expect(newState.entities[subscriptionId][0].preAuthUrl).toBe('https://example.com/new-link');
      expect(newState.refreshingInvoiceRefId).toBeNull();
      expect(newState.error).toBeNull();
    });

    it('should not mutate other invoices', () => {
      const otherInvoice: InvoiceResponse = {
        ...mockInvoice,
        id: 'inv-2',
        preAuthUrl: 'https://other.com',
      };
      const state: InvoicesState = {
        ...initialInvoicesState,
        entities: { [subscriptionId]: [mockInvoice, otherInvoice] },
        refreshingInvoiceRefId: 'inv-1',
      };
      const newState = invoicesReducer(
        state,
        refreshInvoiceLinkSuccess({
          subscriptionId,
          invoiceRefId: 'inv-1',
          preAuthUrl: 'https://example.com/new-link',
        }),
      );
      expect(newState.entities[subscriptionId][0].preAuthUrl).toBe('https://example.com/new-link');
      expect(newState.entities[subscriptionId][1].preAuthUrl).toBe('https://other.com');
    });

    it('should update preAuthUrl in openOverdueList when matching ref', () => {
      const state: InvoicesState = {
        ...initialInvoicesState,
        entities: { [subscriptionId]: [mockInvoice] },
        openOverdueList: [mockInvoice],
        refreshingInvoiceRefId: 'inv-1',
      };
      const newState = invoicesReducer(
        state,
        refreshInvoiceLinkSuccess({
          subscriptionId,
          invoiceRefId: 'inv-1',
          preAuthUrl: 'https://example.com/new-link',
        }),
      );
      expect(newState.openOverdueList[0].preAuthUrl).toBe('https://example.com/new-link');
    });
  });

  describe('refreshInvoiceLinkFailure', () => {
    it('should set error and clear refreshingInvoiceRefId', () => {
      const state: InvoicesState = {
        ...initialInvoicesState,
        refreshingInvoiceRefId: 'ref-1',
      };
      const newState = invoicesReducer(state, refreshInvoiceLinkFailure({ error: 'Refresh failed' }));
      expect(newState.refreshingInvoiceRefId).toBeNull();
      expect(newState.error).toBe('Refresh failed');
    });
  });

  describe('clearInvoices', () => {
    it('should reset to initial state', () => {
      const state: InvoicesState = {
        ...initialInvoicesState,
        entities: { [subscriptionId]: [mockInvoice] },
        loading: true,
      };
      const newState = invoicesReducer(state, clearInvoices());
      expect(newState).toEqual(initialInvoicesState);
    });
  });
});
