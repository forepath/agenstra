import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { filter, pairwise, switchMap } from 'rxjs';
import { of } from 'rxjs';
import {
  InvoicesFacade,
  ServicePlansFacade,
  SubscriptionsFacade,
  type CreateInvoiceDto,
  type ServicePlanResponse,
} from '@forepath/framework/frontend/data-access-billing-console';

@Component({
  selector: 'framework-billing-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss'],
})
export class InvoicesComponent implements OnInit {
  @ViewChild('createInvoiceModal', { static: false }) private createInvoiceModal!: ElementRef<HTMLDivElement>;

  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly servicePlansFacade = inject(ServicePlansFacade);

  readonly subscriptions$ = this.subscriptionsFacade.getSubscriptions$();
  readonly servicePlans$ = this.servicePlansFacade.getServicePlans$();

  readonly selectedSubscriptionId$ = new BehaviorSubject<string>('');
  readonly invoices$ = this.selectedSubscriptionId$.pipe(
    switchMap((id) => (id ? this.invoicesFacade.getInvoicesBySubscriptionId$(id) : of([]))),
  );

  readonly invoicesLoading$ = this.invoicesFacade.getInvoicesLoading$();
  readonly invoicesCreating$ = this.invoicesFacade.getInvoicesCreating$();
  readonly invoicesError$ = this.invoicesFacade.getInvoicesError$();

  createInvoiceDescription = '';

  planNameByPlanId(planId: string, plans: ServicePlanResponse[] | null): string {
    if (!plans) return planId;
    const plan = plans.find((p) => p.id === planId);
    return plan?.name ?? planId;
  }

  ngOnInit(): void {
    this.subscriptionsFacade.loadSubscriptions();
    this.servicePlansFacade.loadServicePlans();
    this.invoicesFacade
      .getInvoicesCreating$()
      .pipe(
        pairwise(),
        filter(([prev, curr]) => prev === true && curr === false),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.hideModal(this.createInvoiceModal);
        this.createInvoiceDescription = '';
      });
  }

  onSelectSubscription(subscriptionId: string): void {
    const id = subscriptionId || '';
    this.selectedSubscriptionId$.next(id);
    if (id) {
      this.invoicesFacade.loadInvoices(id);
    }
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

  openPreAuthUrl(url: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
}
