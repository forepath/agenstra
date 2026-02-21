import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type {
  ServicePlanResponseDto,
  CreateServicePlanDto,
  UpdateServicePlanDto,
  ListServicePlansParams,
} from './service-plans.types';
import {
  loadServicePlans,
  loadServicePlan,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
} from './service-plans.actions';
import {
  selectServicePlans,
  selectSelectedServicePlan,
  selectServicePlansLoading,
  selectServicePlanLoading,
  selectServicePlansCreating,
  selectServicePlansUpdating,
  selectServicePlansDeleting,
  selectServicePlansError,
  selectServicePlansLoadingAny,
  selectServicePlanById,
  selectServicePlansCount,
  selectHasServicePlans,
  selectActiveServicePlans,
  selectServicePlansByServiceTypeId,
} from './service-plans.selectors';

@Injectable({ providedIn: 'root' })
export class ServicePlansFacade {
  private readonly store = inject(Store);

  readonly servicePlans$: Observable<ServicePlanResponseDto[]> = this.store.select(selectServicePlans);
  readonly selectedServicePlan$: Observable<ServicePlanResponseDto | null> =
    this.store.select(selectSelectedServicePlan);
  readonly loading$: Observable<boolean> = this.store.select(selectServicePlansLoading);
  readonly loadingServicePlan$: Observable<boolean> = this.store.select(selectServicePlanLoading);
  readonly creating$: Observable<boolean> = this.store.select(selectServicePlansCreating);
  readonly updating$: Observable<boolean> = this.store.select(selectServicePlansUpdating);
  readonly deleting$: Observable<boolean> = this.store.select(selectServicePlansDeleting);
  readonly error$: Observable<string | null> = this.store.select(selectServicePlansError);
  readonly loadingAny$: Observable<boolean> = this.store.select(selectServicePlansLoadingAny);
  readonly servicePlansCount$: Observable<number> = this.store.select(selectServicePlansCount);
  readonly hasServicePlans$: Observable<boolean> = this.store.select(selectHasServicePlans);
  readonly activeServicePlans$: Observable<ServicePlanResponseDto[]> = this.store.select(selectActiveServicePlans);

  loadServicePlans(params?: ListServicePlansParams): void {
    this.store.dispatch(loadServicePlans({ params }));
  }

  loadServicePlan(id: string): void {
    this.store.dispatch(loadServicePlan({ id }));
  }

  createServicePlan(dto: CreateServicePlanDto): void {
    this.store.dispatch(createServicePlan({ dto }));
  }

  updateServicePlan(id: string, dto: UpdateServicePlanDto): void {
    this.store.dispatch(updateServicePlan({ id, dto }));
  }

  deleteServicePlan(id: string): void {
    this.store.dispatch(deleteServicePlan({ id }));
  }

  getServicePlanById$(id: string): Observable<ServicePlanResponseDto | null> {
    return this.store.select(selectServicePlanById(id));
  }

  getServicePlansByServiceTypeId$(serviceTypeId: string): Observable<ServicePlanResponseDto[]> {
    return this.store.select(selectServicePlansByServiceTypeId(serviceTypeId));
  }
}
