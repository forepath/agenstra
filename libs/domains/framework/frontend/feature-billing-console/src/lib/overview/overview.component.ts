import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BackordersFacade,
  CustomerProfileFacade,
  InvoicesFacade,
  SubscriptionsFacade,
} from '@forepath/framework/frontend/data-access-billing-console';

@Component({
  selector: 'framework-billing-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnInit {
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly backordersFacade = inject(BackordersFacade);
  private readonly customerProfileFacade = inject(CustomerProfileFacade);
  private readonly invoicesFacade = inject(InvoicesFacade);

  readonly subscriptions$ = this.subscriptionsFacade.getSubscriptions$();
  readonly invoicesSummary$ = this.invoicesFacade.getInvoicesSummary$();
  readonly invoicesSummaryLoading$ = this.invoicesFacade.getInvoicesSummaryLoading$();
  readonly subscriptionsLoading$ = this.subscriptionsFacade.getSubscriptionsLoading$();
  readonly subscriptionsError$ = this.subscriptionsFacade.getSubscriptionsError$();
  readonly activeSubscriptions$ = this.subscriptionsFacade.getActiveSubscriptions$();

  readonly backorders$ = this.backordersFacade.getBackorders$();
  readonly pendingBackorders$ = this.backordersFacade.getPendingBackorders$();
  readonly backordersLoading$ = this.backordersFacade.getBackordersLoading$();
  readonly backordersError$ = this.backordersFacade.getBackordersError$();

  readonly customerProfile$ = this.customerProfileFacade.getCustomerProfile$();
  readonly customerProfileLoading$ = this.customerProfileFacade.getCustomerProfileLoading$();
  readonly isCustomerProfileComplete$ = this.customerProfileFacade.isCustomerProfileComplete$();

  ngOnInit(): void {
    this.subscriptionsFacade.loadSubscriptions();
    this.backordersFacade.loadBackorders();
    this.customerProfileFacade.loadCustomerProfile();
    this.invoicesFacade.loadInvoicesSummary();
  }
}
