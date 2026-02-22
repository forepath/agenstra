import { initialInvoicesState, type InvoicesState } from './invoices.reducer';
import {
  selectInvoicesBySubscriptionId,
  selectInvoicesCountBySubscriptionId,
  selectInvoicesCreating,
  selectInvoicesEntities,
  selectInvoicesError,
  selectInvoicesLoading,
  selectInvoicesLoadingAny,
  selectInvoicesState,
  selectHasInvoicesBySubscriptionId,
} from './invoices.selectors';
import type { InvoiceResponse } from '../../types/billing.types';

describe('Invoices Selectors', () => {
  const subscriptionId = 'sub-1';
  const mockInvoice: InvoiceResponse = {
    id: 'inv-1',
    subscriptionId: 'sub-1',
    invoiceNinjaId: 'ninja-1',
    preAuthUrl: 'https://example.com/auth',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const createState = (overrides?: Partial<InvoicesState>): InvoicesState => ({
    ...initialInvoicesState,
    ...overrides,
  });

  describe('selectInvoicesState', () => {
    it('should select the invoices feature state', () => {
      const state = createState();
      const rootState = { invoices: state };
      expect(selectInvoicesState(rootState as never)).toEqual(state);
    });
  });

  describe('selectInvoicesEntities', () => {
    it('should select entities', () => {
      const state = createState({
        entities: { [subscriptionId]: [mockInvoice] },
      });
      const rootState = { invoices: state };
      expect(selectInvoicesEntities(rootState as never)).toEqual({ [subscriptionId]: [mockInvoice] });
    });
  });

  describe('selectInvoicesLoading', () => {
    it('should return loading state', () => {
      const state = createState({ loading: true });
      const rootState = { invoices: state };
      expect(selectInvoicesLoading(rootState as never)).toBe(true);
    });
  });

  describe('selectInvoicesCreating', () => {
    it('should return creating state', () => {
      const state = createState({ creating: true });
      const rootState = { invoices: state };
      expect(selectInvoicesCreating(rootState as never)).toBe(true);
    });
  });

  describe('selectInvoicesError', () => {
    it('should return error', () => {
      const state = createState({ error: 'Test error' });
      const rootState = { invoices: state };
      expect(selectInvoicesError(rootState as never)).toBe('Test error');
    });
  });

  describe('selectInvoicesLoadingAny', () => {
    it('should return true when loading or creating', () => {
      const state = createState({ loading: true });
      const rootState = { invoices: state };
      expect(selectInvoicesLoadingAny(rootState as never)).toBe(true);
    });
  });

  describe('selectInvoicesBySubscriptionId', () => {
    it('should return invoices for subscription', () => {
      const state = createState({
        entities: { [subscriptionId]: [mockInvoice] },
      });
      const rootState = { invoices: state };
      const selector = selectInvoicesBySubscriptionId(subscriptionId);
      expect(selector(rootState as never)).toEqual([mockInvoice]);
    });
    it('should return empty array when no invoices for subscription', () => {
      const state = createState({ entities: {} });
      const rootState = { invoices: state };
      const selector = selectInvoicesBySubscriptionId(subscriptionId);
      expect(selector(rootState as never)).toEqual([]);
    });
  });

  describe('selectInvoicesCountBySubscriptionId', () => {
    it('should return count for subscription', () => {
      const state = createState({
        entities: { [subscriptionId]: [mockInvoice, { ...mockInvoice, id: 'inv-2' }] },
      });
      const rootState = { invoices: state };
      const selector = selectInvoicesCountBySubscriptionId(subscriptionId);
      expect(selector(rootState as never)).toBe(2);
    });
  });

  describe('selectHasInvoicesBySubscriptionId', () => {
    it('should return true when subscription has invoices', () => {
      const state = createState({
        entities: { [subscriptionId]: [mockInvoice] },
      });
      const rootState = { invoices: state };
      const selector = selectHasInvoicesBySubscriptionId(subscriptionId);
      expect(selector(rootState as never)).toBe(true);
    });
    it('should return false when subscription has no invoices', () => {
      const state = createState({ entities: {} });
      const rootState = { invoices: state };
      const selector = selectHasInvoicesBySubscriptionId(subscriptionId);
      expect(selector(rootState as never)).toBe(false);
    });
  });
});
