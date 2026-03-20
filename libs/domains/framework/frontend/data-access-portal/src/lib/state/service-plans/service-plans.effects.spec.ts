import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, throwError } from 'rxjs';
import { PublicServicePlanOfferingsService } from '../../services/public-service-plan-offerings.service';
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
import { loadCheapestServicePlanOffering$, loadServicePlans$, loadServicePlansBatch$ } from './service-plans.effects';

describe('Portal ServicePlansEffects', () => {
  let actions$: Actions;
  let offeringsService: jest.Mocked<PublicServicePlanOfferingsService>;

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
    offeringsService = {
      listOfferings: jest.fn(),
      getCheapestOffering: jest.fn(),
    } as never;

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        { provide: PublicServicePlanOfferingsService, useValue: offeringsService },
      ],
    });

    actions$ = TestBed.inject(Actions);
  });

  describe('loadServicePlans$', () => {
    it('should return loadServicePlansSuccess when batch is empty', (done) => {
      actions$ = of(loadServicePlans({ params: {} }));
      offeringsService.listOfferings.mockReturnValue(of([]));

      loadServicePlans$(actions$, offeringsService).subscribe((result) => {
        expect(result).toEqual(loadServicePlansSuccess({ servicePlans: [] }));
        done();
      });
    });

    it('should return loadServicePlansFailure on error', (done) => {
      actions$ = of(loadServicePlans({ params: {} }));
      offeringsService.listOfferings.mockReturnValue(throwError(() => new Error('Load failed')));

      loadServicePlans$(actions$, offeringsService).subscribe((result) => {
        expect(result).toEqual(loadServicePlansFailure({ error: 'Load failed' }));
        done();
      });
    });
  });

  describe('loadServicePlansBatch$', () => {
    it('should return loadServicePlansSuccess when follow-up batch is empty', (done) => {
      const accumulated = [mockOffering];
      actions$ = of(loadServicePlansBatch({ offset: 10, accumulatedServicePlans: accumulated }));
      offeringsService.listOfferings.mockReturnValue(of([]));

      loadServicePlansBatch$(actions$, offeringsService).subscribe((result) => {
        expect(result).toEqual(loadServicePlansSuccess({ servicePlans: accumulated }));
        done();
      });
    });
  });

  describe('loadCheapestServicePlanOffering$', () => {
    it('should return loadCheapestServicePlanOfferingSuccess on success', (done) => {
      actions$ = of(loadCheapestServicePlanOffering({}));
      offeringsService.getCheapestOffering.mockReturnValue(of(mockOffering));

      loadCheapestServicePlanOffering$(actions$, offeringsService).subscribe((result) => {
        expect(result).toEqual(loadCheapestServicePlanOfferingSuccess({ offering: mockOffering }));
        done();
      });
    });

    it('should return loadCheapestServicePlanOfferingFailure on error', (done) => {
      actions$ = of(loadCheapestServicePlanOffering({}));
      offeringsService.getCheapestOffering.mockReturnValue(throwError(() => new Error('Not found')));

      loadCheapestServicePlanOffering$(actions$, offeringsService).subscribe((result) => {
        expect(result).toEqual(loadCheapestServicePlanOfferingFailure({ error: 'Not found' }));
        done();
      });
    });
  });
});
