import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  InvoicesFacade,
  ServicePlansFacade,
  SubscriptionsFacade,
  type CreateInvoiceDto,
  type InvoiceResponse,
  type ServicePlanResponse,
} from '@forepath/framework/frontend/data-access-billing-console';
import { BehaviorSubject, combineLatest, filter, map, of, pairwise, switchMap } from 'rxjs';
import { NextBillingDayPipe } from '../pipes/next-billing-day.pipe';

const PAGE_SIZE = 10;

@Component({
  selector: 'framework-billing-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, NextBillingDayPipe],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss'],
})
export class InvoicesComponent implements OnInit {
  @ViewChild('createInvoiceModal', { static: false }) private createInvoiceModal!: ElementRef<HTMLDivElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly servicePlansFacade = inject(ServicePlansFacade);

  readonly subscriptions$ = this.subscriptionsFacade.getSubscriptions$();
  readonly servicePlans$ = this.servicePlansFacade.getServicePlans$();

  readonly selectedSubscriptionId$ = new BehaviorSubject<string>('');
  readonly selectedSubscription$ = combineLatest([this.subscriptions$, this.selectedSubscriptionId$]).pipe(
    map(([subscriptions, id]) => subscriptions.find((s) => s.id === id) ?? null),
  );

  readonly allInvoices = toSignal(
    this.selectedSubscriptionId$.pipe(
      switchMap((id) => (id ? this.invoicesFacade.getInvoicesBySubscriptionId$(id) : of([]))),
    ),
    { initialValue: [] as InvoiceResponse[] },
  );

  readonly invoicesPage = signal(0);
  readonly paginatedInvoices = computed(() => {
    const list = this.allInvoices();
    const page = this.invoicesPage();
    const start = page * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  });
  readonly invoicesTotalPages = computed(() => Math.max(1, Math.ceil(this.allInvoices().length / PAGE_SIZE)));

  readonly invoicesLoading$ = this.invoicesFacade.getInvoicesLoading$();
  readonly invoicesCreating$ = this.invoicesFacade.getInvoicesCreating$();
  readonly invoicesError$ = this.invoicesFacade.getInvoicesError$();
  readonly refreshingInvoiceRefId$ = this.invoicesFacade.getRefreshingInvoiceRefId$();
  readonly invoicesSummary$ = this.invoicesFacade.getInvoicesSummary$();
  readonly invoicesSummaryLoading$ = this.invoicesFacade.getInvoicesSummaryLoading$();
  readonly openOverdueList$ = this.invoicesFacade.getOpenOverdueList$();
  readonly openOverdueListLoading$ = this.invoicesFacade.getOpenOverdueListLoading$();
  readonly openOverdueListError$ = this.invoicesFacade.getOpenOverdueListError$();

  /** True when the selected subscription is finalized (canceled), so no further invoices can be created. */
  readonly isCreateInvoiceDisabled$ = combineLatest([this.invoicesCreating$, this.selectedSubscription$]).pipe(
    map(([creating, sub]) => creating === true || (sub?.status === 'canceled' && sub?.nextBillingAt !== null)),
  );

  createInvoiceDescription = '';

  /** Shown when Create invoice is disabled because the subscription is finalized (canceled). */
  readonly createInvoiceDisabledTitle = $localize`:@@featureInvoices-createInvoiceDisabledFinalized:Subscription is finalized; no further invoices can be created.`;

  planNameByPlanId(planId: string, plans: ServicePlanResponse[] | null): string {
    if (!plans) return planId;
    const plan = plans.find((p) => p.id === planId);
    return plan?.name ?? planId;
  }

  ngOnInit(): void {
    this.subscriptionsFacade.loadSubscriptions();
    this.servicePlansFacade.loadServicePlans();
    this.invoicesFacade.loadInvoicesSummary();
    this.invoicesFacade.loadOpenOverdueInvoices();
    this.invoicesFacade
      .getInvoicesCreating$()
      .pipe(
        pairwise(),
        filter(([prev, curr]) => prev === true && curr === false),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.hideModal(this.createInvoiceModal);
        this.createInvoiceDescription = '';
      });
  }

  onSelectSubscription(subscriptionId: string): void {
    const id = subscriptionId || '';
    this.selectedSubscriptionId$.next(id);
    this.invoicesPage.set(0);
    if (id) {
      this.invoicesFacade.loadInvoices(id);
    }
  }

  onInvoicesPageChange(page: number): void {
    this.invoicesPage.set(page);
  }

  openCreateInvoiceModal(): void {
    this.createInvoiceDescription = '';
    this.showModal(this.createInvoiceModal);
  }

  onSubmitCreateInvoice(): void {
    const id = this.selectedSubscriptionId$.value;
    if (!id) return;
    const dto: CreateInvoiceDto | undefined = this.createInvoiceDescription?.trim()
      ? { description: this.createInvoiceDescription.trim() }
      : undefined;
    this.invoicesFacade.createInvoice(id, dto);
  }

  get selectedSubscriptionId(): string {
    return this.selectedSubscriptionId$.value;
  }
  set selectedSubscriptionId(value: string) {
    this.onSelectSubscription(value ?? '');
  }

  /**
   * Fetches a fresh invite link (the previous one may have expired) then opens it in a new tab.
   * Use when the subscription context is the selected subscription (subscription-specific table).
   */
  openInvoiceLink(inv: InvoiceResponse): void {
    const subscriptionId = this.selectedSubscriptionId$.value;
    if (!subscriptionId || !inv.id) return;
    this.openInvoiceLinkForRef(subscriptionId, inv);
  }

  /**
   * Same as openInvoiceLink but uses the given subscriptionId (e.g. for open-overdue list where each row has its own subscriptionId).
   */
  openInvoiceLinkForRef(subscriptionId: string, inv: InvoiceResponse): void {
    if (!subscriptionId || !inv.id) return;
    this.invoicesFacade.refreshInvoiceLink(subscriptionId, inv.id).subscribe({
      next: (preAuthUrl) => {
        if (preAuthUrl) {
          window.open(preAuthUrl, '_blank', 'noopener,noreferrer');
        }
      },
      error: () => {
        // Error is already stored and shown via invoicesError$
      },
    });
  }

  private showModal(modalElement: ElementRef<HTMLDivElement>): void {
    if (modalElement?.nativeElement) {
      const modal = (
        window as unknown as {
          bootstrap?: { Modal?: { getOrCreateInstance: (el: HTMLElement) => { show: () => void } } };
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

  getInvoiceStatus(status: string | null | undefined): string {
    switch (status) {
      case '1':
        return $localize`:@@featureInvoices-statusDraft:Draft`;
      case '2':
        return $localize`:@@featureInvoices-statusSent:Sent`;
      case '3':
        return $localize`:@@featureInvoices-statusPartiallyPaid:Partially paid`;
      case '4':
        return $localize`:@@featureInvoices-statusPaid:Paid`;
      case '5':
        return $localize`:@@featureInvoices-statusCancelled:Cancelled`;
      case '6':
        return $localize`:@@featureInvoices-statusReversed:Reversed`;
      case '-1':
        return $localize`:@@featureInvoices-statusFailed:Failed`;
      case '-2':
        return $localize`:@@featureInvoices-statusUnpaid:Unpaid`;
      default:
        return $localize`:@@featureInvoices-statusUnknown:Unknown (${status})`;
    }
  }
}
