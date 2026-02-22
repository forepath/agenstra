import {
  clearInvoices,
  createInvoice,
  createInvoiceFailure,
  createInvoiceSuccess,
  loadInvoices,
  loadInvoicesFailure,
  loadInvoicesSuccess,
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
