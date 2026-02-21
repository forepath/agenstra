import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type {
  ServiceTypeResponseDto,
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
  ListServiceTypesParams,
} from './service-types.types';
import {
  loadServiceTypes,
  loadServiceType,
  createServiceType,
  updateServiceType,
  deleteServiceType,
} from './service-types.actions';
import {
  selectServiceTypes,
  selectSelectedServiceType,
  selectServiceTypesLoading,
  selectServiceTypeLoading,
  selectServiceTypesCreating,
  selectServiceTypesUpdating,
  selectServiceTypesDeleting,
  selectServiceTypesError,
  selectServiceTypesLoadingAny,
  selectServiceTypeById,
  selectServiceTypesCount,
  selectHasServiceTypes,
  selectActiveServiceTypes,
} from './service-types.selectors';

@Injectable({ providedIn: 'root' })
export class ServiceTypesFacade {
  private readonly store = inject(Store);

  readonly serviceTypes$: Observable<ServiceTypeResponseDto[]> = this.store.select(selectServiceTypes);
  readonly selectedServiceType$: Observable<ServiceTypeResponseDto | null> =
    this.store.select(selectSelectedServiceType);
  readonly loading$: Observable<boolean> = this.store.select(selectServiceTypesLoading);
  readonly loadingServiceType$: Observable<boolean> = this.store.select(selectServiceTypeLoading);
  readonly creating$: Observable<boolean> = this.store.select(selectServiceTypesCreating);
  readonly updating$: Observable<boolean> = this.store.select(selectServiceTypesUpdating);
  readonly deleting$: Observable<boolean> = this.store.select(selectServiceTypesDeleting);
  readonly error$: Observable<string | null> = this.store.select(selectServiceTypesError);
  readonly loadingAny$: Observable<boolean> = this.store.select(selectServiceTypesLoadingAny);
  readonly serviceTypesCount$: Observable<number> = this.store.select(selectServiceTypesCount);
  readonly hasServiceTypes$: Observable<boolean> = this.store.select(selectHasServiceTypes);
  readonly activeServiceTypes$: Observable<ServiceTypeResponseDto[]> = this.store.select(selectActiveServiceTypes);

  loadServiceTypes(params?: ListServiceTypesParams): void {
    this.store.dispatch(loadServiceTypes({ params }));
  }

  loadServiceType(id: string): void {
    this.store.dispatch(loadServiceType({ id }));
  }

  createServiceType(dto: CreateServiceTypeDto): void {
    this.store.dispatch(createServiceType({ dto }));
  }

  updateServiceType(id: string, dto: UpdateServiceTypeDto): void {
    this.store.dispatch(updateServiceType({ id, dto }));
  }

  deleteServiceType(id: string): void {
    this.store.dispatch(deleteServiceType({ id }));
  }

  getServiceTypeById$(id: string): Observable<ServiceTypeResponseDto | null> {
    return this.store.select(selectServiceTypeById(id));
  }
}
