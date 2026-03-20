import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import type { PublicServicePlanOffering } from '../../types/portal-service-plans.types';
import { loadCheapestServicePlanOffering, loadServicePlans } from './service-plans.actions';
import { ServicePlansFacade } from './service-plans.facade';

describe('ServicePlansFacade', () => {
  let facade: ServicePlansFacade;
  let store: jest.Mocked<Store>;

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

  beforeEach(() => {
    store = { select: jest.fn(), dispatch: jest.fn() } as never;

    TestBed.configureTestingModule({
      providers: [ServicePlansFacade, { provide: Store, useValue: store }],
    });

    facade = TestBed.inject(ServicePlansFacade);
  });

  it('getCheapestServicePlanOffering$ should select cheapest offering', (done) => {
    store.select.mockReturnValue(of(mockOffering));
    facade.getCheapestServicePlanOffering$().subscribe((result) => {
      expect(result).toEqual(mockOffering);
      done();
    });
  });

  it('loadCheapestServicePlanOffering should dispatch', () => {
    facade.loadCheapestServicePlanOffering('st-x');
    expect(store.dispatch).toHaveBeenCalledWith(loadCheapestServicePlanOffering({ serviceTypeId: 'st-x' }));
  });

  it('loadServicePlans should dispatch', () => {
    facade.loadServicePlans({ limit: 5 });
    expect(store.dispatch).toHaveBeenCalledWith(loadServicePlans({ params: { limit: 5 } }));
  });
});
