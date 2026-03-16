import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BackordersFacade,
  CustomerProfileFacade,
  InvoicesFacade,
  SubscriptionServerInfoFacade,
  SubscriptionsFacade,
} from '@forepath/framework/frontend/data-access-billing-console';
import { filter, take } from 'rxjs';

@Component({
  selector: 'framework-billing-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnInit {
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  readonly serverInfoFacade = inject(SubscriptionServerInfoFacade);
  private readonly backordersFacade = inject(BackordersFacade);
  private readonly customerProfileFacade = inject(CustomerProfileFacade);
  private readonly invoicesFacade = inject(InvoicesFacade);

  readonly subscriptions$ = this.subscriptionsFacade.getSubscriptions$();
  readonly invoicesSummary$ = this.invoicesFacade.getInvoicesSummary$();
  readonly invoicesSummaryLoading$ = this.invoicesFacade.getInvoicesSummaryLoading$();
  readonly subscriptionsLoading$ = this.subscriptionsFacade.getSubscriptionsLoading$();
  readonly subscriptionsError$ = this.subscriptionsFacade.getSubscriptionsError$();
  readonly activeSubscriptions$ = this.subscriptionsFacade.getActiveSubscriptions$();

  readonly subscriptionsWithServerInfo$ = this.serverInfoFacade.getSubscriptionsWithServerInfo$();
  readonly overviewServerInfoLoading$ = this.serverInfoFacade.getOverviewServerInfoLoading$();
  readonly overviewServerInfoError$ = this.serverInfoFacade.getOverviewServerInfoError$();
  readonly serverActionInProgressMap$ = this.serverInfoFacade.getServerActionInProgressMap$();

  @ViewChild('sshKeyModal') sshKeyModalRef?: ElementRef<HTMLDivElement>;
  sshKeyForModal = '';
  sshKeyModalHostname = '';

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
    this.subscriptionsLoading$
      .pipe(
        filter((loading) => !loading),
        take(1),
      )
      .subscribe(() => this.serverInfoFacade.loadOverviewServerInfo());
  }

  openSshKeyModal(sshPrivateKey: string | null | undefined, hostname: string | null | undefined): void {
    this.sshKeyForModal = sshPrivateKey ?? '';
    this.sshKeyModalHostname = hostname ?? '';
    if (this.sshKeyModalRef) {
      this.showModal(this.sshKeyModalRef);
    }
  }

  hideSshKeyModal(): void {
    if (this.sshKeyModalRef) {
      this.hideModal(this.sshKeyModalRef);
    }
  }

  private showModal(modalElement: ElementRef<HTMLDivElement> | undefined): void {
    if (modalElement?.nativeElement) {
      const modal = (
        window as unknown as {
          bootstrap?: {
            Modal?: {
              getOrCreateInstance: (el: HTMLElement) => { show: () => void };
              getInstance: (el: HTMLElement) => { hide: () => void } | null;
            };
          };
        }
      ).bootstrap?.Modal?.getOrCreateInstance(modalElement.nativeElement);
      if (modal) {
        modal.show();
      }
    }
  }

  private hideModal(modalElement: ElementRef<HTMLDivElement>): void {
    if (modalElement?.nativeElement) {
      const modal = (
        window as unknown as {
          bootstrap?: { Modal?: { getInstance: (el: HTMLElement) => { hide: () => void } | null } };
        }
      ).bootstrap?.Modal?.getInstance(modalElement.nativeElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  getProviderName(provider: {} | undefined): string | undefined {
    if (!provider) {
      return undefined;
    }

    switch (provider) {
      case 'hetzner':
        return 'Hetzner Cloud';
      case 'digitalocean':
        return 'DigitalOcean';
      default:
        return undefined;
    }
  }
}
