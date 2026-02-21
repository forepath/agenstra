import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  SubscriptionsFacade,
  ServicePlansFacade,
  ServiceTypesFacade,
  ServicePlanResponseDto,
} from '@forepath/framework/frontend/data-access-billing-console';
import { SubscriptionStatus } from '@forepath/framework/frontend/data-access-billing-console';

@Component({
  selector: 'framework-billing-subscriptions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrls: ['./subscriptions.component.scss'],
})
export class SubscriptionsComponent implements OnInit {
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly servicePlansFacade = inject(ServicePlansFacade);
  private readonly serviceTypesFacade = inject(ServiceTypesFacade);

  readonly subscriptions$ = this.subscriptionsFacade.subscriptions$;
  readonly servicePlans$ = this.servicePlansFacade.servicePlans$;
  readonly serviceTypes$ = this.serviceTypesFacade.serviceTypes$;
  readonly loading$ = this.subscriptionsFacade.loading$;
  readonly error$ = this.subscriptionsFacade.error$;

  readonly SubscriptionStatus = SubscriptionStatus;

  ngOnInit(): void {
    this.subscriptionsFacade.loadSubscriptions();
    this.servicePlansFacade.loadServicePlans();
    this.serviceTypesFacade.loadServiceTypes();
  }

  getStatusBadgeClass(status: SubscriptionStatus): string {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'bg-success';
      case SubscriptionStatus.PENDING_BACKORDER:
        return 'bg-warning';
      case SubscriptionStatus.PENDING_CANCEL:
        return 'bg-secondary';
      case SubscriptionStatus.CANCELED:
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getPlanName(planId: string, plans: ServicePlanResponseDto[] | null): string {
    if (!plans) return planId;
    const plan = plans.find((p: ServicePlanResponseDto) => p.id === planId);
    return plan?.name ?? planId;
  }
}
