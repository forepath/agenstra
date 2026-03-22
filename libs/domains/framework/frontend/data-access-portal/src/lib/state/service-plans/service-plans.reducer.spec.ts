import type { PublicServicePlanOffering } from '../../types/portal-service-plans.types';
import {
  loadCheapestServicePlanOffering,
  loadCheapestServicePlanOfferingFailure,
  loadCheapestServicePlanOfferingSuccess,
  loadServicePlans,
  loadServicePlansBatch,
  loadServicePlansFailure,
  loadServicePlansSuccess,
} from './service-plans.actions';
import { initialServicePlansState, servicePlansReducer, type ServicePlansState } from './service-plans.reducer';

describe('servicePlansReducer', () => {
  const mockOffering: PublicServicePlanOffering = {
    id: 'sp-1',
    name: 'Basic',
    description: null,
    serviceTypeId: 'st-1',
    serviceTypeName: 'Cloud',
    billingIntervalType: 'month',
    billingIntervalValue: 1,
    totalPrice: 99,
    orderingHighlights: [],
  };

  it('should return initial state', () => {
    expect(servicePlansReducer(undefined, { type: '@@init' } as never)).toEqual(initialServicePlansState);
  });

  describe('loadServicePlans', () => {
    it('should set loading and clear entities', () => {
      const state: ServicePlansState = {
        ...initialServicePlansState,
        entities: [mockOffering],
        loading: false,
      };
      const newState = servicePlansReducer(state, loadServicePlans({ params: {} }));
      expect(newState.loading).toBe(true);
      expect(newState.entities).toEqual([]);
      expect(newState.error).toBeNull();
    });
  });

  describe('loadServicePlansBatch', () => {
    it('should update accumulated entities while loading', () => {
      const accumulated = [mockOffering];
      const newState = servicePlansReducer(
        initialServicePlansState,
        loadServicePlansBatch({ offset: 10, accumulatedServicePlans: accumulated }),
      );
      expect(newState.entities).toEqual(accumulated);
      expect(newState.loading).toBe(true);
    });
  });

  describe('loadServicePlansSuccess', () => {
    it('should set entities and clear loading', () => {
      const newState = servicePlansReducer(
        { ...initialServicePlansState, loading: true },
        loadServicePlansSuccess({ servicePlans: [mockOffering] }),
      );
      expect(newState.entities).toEqual([mockOffering]);
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
    });
  });

  describe('loadServicePlansFailure', () => {
    it('should set error and clear loading', () => {
      const newState = servicePlansReducer(
        { ...initialServicePlansState, loading: true },
        loadServicePlansFailure({ error: 'failed' }),
      );
      expect(newState.loading).toBe(false);
      expect(newState.error).toBe('failed');
    });
  });

  describe('loadCheapestServicePlanOffering', () => {
    it('should set loadingCheapest', () => {
      const newState = servicePlansReducer(initialServicePlansState, loadCheapestServicePlanOffering({}));
      expect(newState.loadingCheapest).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('loadCheapestServicePlanOfferingSuccess', () => {
    it('should set cheapestOffering', () => {
      const newState = servicePlansReducer(
        { ...initialServicePlansState, loadingCheapest: true },
        loadCheapestServicePlanOfferingSuccess({ offering: mockOffering }),
      );
      expect(newState.cheapestOffering).toEqual(mockOffering);
      expect(newState.loadingCheapest).toBe(false);
    });
  });

  describe('loadCheapestServicePlanOfferingFailure', () => {
    it('should set error and clear loadingCheapest', () => {
      const newState = servicePlansReducer(
        { ...initialServicePlansState, loadingCheapest: true },
        loadCheapestServicePlanOfferingFailure({ error: 'not found' }),
      );
      expect(newState.loadingCheapest).toBe(false);
      expect(newState.error).toBe('not found');
    });
  });
});
