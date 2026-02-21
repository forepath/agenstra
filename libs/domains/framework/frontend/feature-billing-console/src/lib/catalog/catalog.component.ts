import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
import {
  ServiceTypesFacade,
  ServicePlansFacade,
  AuthenticationFacade,
} from '@forepath/framework/frontend/data-access-billing-console';

@Component({
  selector: 'framework-billing-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss'],
})
export class CatalogComponent implements OnInit {
  private readonly serviceTypesFacade = inject(ServiceTypesFacade);
  private readonly servicePlansFacade = inject(ServicePlansFacade);
  private readonly authFacade = inject(AuthenticationFacade);

  readonly serviceTypes$ = this.serviceTypesFacade.serviceTypes$;
  readonly servicePlans$ = this.servicePlansFacade.servicePlans$;
  readonly loading$ = combineLatest([this.serviceTypesFacade.loading$, this.servicePlansFacade.loading$]).pipe(
    map(([a, b]) => a || b),
  );
  readonly isAdmin$ = this.authFacade.isAdmin$;

  activeTab: 'service-types' | 'service-plans' = 'service-types';

  ngOnInit(): void {
    this.serviceTypesFacade.loadServiceTypes();
    this.servicePlansFacade.loadServicePlans();
  }

  setActiveTab(tab: 'service-types' | 'service-plans'): void {
    this.activeTab = tab;
  }

  onCreateServiceType(): void {
    // TODO: Open service type form modal
  }

  onEditServiceType(id: string): void {
    // TODO: Open service type form modal with existing data
  }

  onDeleteServiceType(id: string): void {
    if (confirm('Are you sure you want to delete this service type?')) {
      this.serviceTypesFacade.deleteServiceType(id);
    }
  }

  onCreateServicePlan(): void {
    // TODO: Open service plan form modal
  }

  onEditServicePlan(id: string): void {
    // TODO: Open service plan form modal with existing data
  }

  onDeleteServicePlan(id: string): void {
    if (confirm('Are you sure you want to delete this service plan?')) {
      this.servicePlansFacade.deleteServicePlan(id);
    }
  }
}
