import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BackordersFacade,
  CustomerProfileFacade,
  ServicePlansFacade,
  SubscriptionsFacade,
  type BackorderResponse,
  type CreateSubscriptionDto,
  type CustomerProfileDto,
  type ServicePlanResponse,
  type SubscriptionResponse,
} from '@forepath/framework/frontend/data-access-billing-console';
import { ENVIRONMENT, type Environment } from '@forepath/framework/frontend/util-configuration';
import { filter, pairwise, take, withLatestFrom } from 'rxjs';

@Component({
  selector: 'framework-billing-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrls: ['./subscriptions.component.scss'],
})
export class SubscriptionsComponent implements OnInit {
  @ViewChild('orderPlanModal', { static: false }) private orderPlanModal!: ElementRef<HTMLDivElement>;
  @ViewChild('cancelSubscriptionModal', { static: false }) private cancelSubscriptionModal!: ElementRef<HTMLDivElement>;
  @ViewChild('resumeConfirmModal', { static: false }) private resumeConfirmModal!: ElementRef<HTMLDivElement>;
  @ViewChild('cancelBackorderModal', { static: false }) private cancelBackorderModal!: ElementRef<HTMLDivElement>;
  @ViewChild('editProfileModal', { static: false }) private editProfileModal!: ElementRef<HTMLDivElement>;

  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly servicePlansFacade = inject(ServicePlansFacade);
  private readonly backordersFacade = inject(BackordersFacade);
  private readonly customerProfileFacade = inject(CustomerProfileFacade);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  readonly subscriptions$ = this.subscriptionsFacade.getSubscriptions$();
  readonly subscriptionsLoading$ = this.subscriptionsFacade.getSubscriptionsLoading$();
  readonly subscriptionsError$ = this.subscriptionsFacade.getSubscriptionsError$();
  readonly subscriptionsCreating$ = this.subscriptionsFacade.getSubscriptionsCreating$();

  readonly servicePlans$ = this.servicePlansFacade.getActiveServicePlans$();
  readonly servicePlansLoading$ = this.servicePlansFacade.getServicePlansLoading$();

  readonly pendingBackorders$ = this.backordersFacade.getPendingBackorders$();
  readonly backordersLoading$ = this.backordersFacade.getBackordersLoading$();
  readonly backordersError$ = this.backordersFacade.getBackordersError$();

  readonly customerProfile$ = this.customerProfileFacade.getCustomerProfile$();
  readonly customerProfileUpdating$ = this.customerProfileFacade.getCustomerProfileUpdating$();
  readonly customerProfileError$ = this.customerProfileFacade.getCustomerProfileError$();
  readonly isCustomerProfileComplete$ = this.customerProfileFacade.isCustomerProfileComplete$();

  readonly termsUrl = this.environment.cookieConsent.termsUrl;
  readonly privacyUrl = this.environment.cookieConsent.privacyPolicyUrl;

  orderPlanId = '';
  orderAutoBackorder = false;
  orderAcceptLegal = false;
  subscriptionToCancel: SubscriptionResponse | null = null;
  subscriptionToResume: SubscriptionResponse | null = null;
  backorderToRetry: BackorderResponse | null = null;
  backorderToCancel: BackorderResponse | null = null;

  profileForm: CustomerProfileDto = {};

  planNameByPlanId(plans: ServicePlanResponse[], planId: string): string {
    const plan = plans?.find((p) => p.id === planId);
    return plan?.name ?? planId;
  }

  /** Calculates total price from plan (base + margin). Same formula as backend PricingService. */
  getPlanTotalPrice(plan: ServicePlanResponse): number | null {
    const base = this.parsePlanNumber(plan.basePrice);
    if (base <= 0) return null;
    const marginPct = this.parsePlanNumber(plan.marginPercent);
    const marginFix = this.parsePlanNumber(plan.marginFixed);
    return base + base * (marginPct / 100) + marginFix;
  }

  private parsePlanNumber(value: string | number | null | undefined): number {
    if (value === undefined || value === null) return 0;
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(n) ? n : 0;
  }

  /** Formats plan price for display (e.g. "€4.51" or "—"). */
  formatPlanPrice(plan: ServicePlanResponse): string {
    const total = this.getPlanTotalPrice(plan);
    if (total === null) return '—';
    return `€${Number.isInteger(total) ? String(total) : total.toFixed(2)}`;
  }

  /** Option label for plan select: name + price + billing interval. */
  formatPlanOptionLabel(plan: ServicePlanResponse): string {
    const price = this.formatPlanPrice(plan);
    const interval = `${plan.billingIntervalValue} ${plan.billingIntervalType}(s)`;
    return `${plan.name} – ${price} / ${interval}`;
  }

  /** Returns the plan matching planId from the list, or null. */
  getSelectedPlan(plans: ServicePlanResponse[] | null, planId: string): ServicePlanResponse | null {
    if (!plans?.length || !planId?.trim()) return null;
    return plans.find((p) => p.id === planId) ?? null;
  }

  ngOnInit(): void {
    this.subscriptionsFacade.loadSubscriptions();
    this.servicePlansFacade.loadServicePlans();
    this.backordersFacade.loadBackorders();
    this.customerProfileFacade.loadCustomerProfile();
  }

  constructor() {
    const subFacade = inject(SubscriptionsFacade);
    const profileFacade = inject(CustomerProfileFacade);
    subFacade
      .getSubscriptionsCreating$()
      .pipe(
        pairwise(),
        filter(([prev, curr]) => prev === true && curr === false),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.hideModal(this.orderPlanModal);
        this.orderPlanId = '';
        this.orderAutoBackorder = true;
        this.orderAcceptLegal = false;
      });
    profileFacade
      .getCustomerProfileUpdating$()
      .pipe(
        pairwise(),
        filter(([prev, curr]) => prev === true && curr === false),
        withLatestFrom(profileFacade.getCustomerProfileError$()),
        takeUntilDestroyed(),
      )
      .subscribe(([, error]) => {
        if (!error) {
          this.hideModal(this.editProfileModal);
        }
      });
  }

  openOrderPlanModal(): void {
    this.orderPlanId = '';
    this.orderAutoBackorder = true;
    this.orderAcceptLegal = false;
    this.servicePlans$
      .pipe(
        filter((plans) => (plans?.length ?? 0) > 0),
        take(1),
      )
      .subscribe((plans) => {
        this.orderPlanId = plans[0].id;
      });
    this.showModal(this.orderPlanModal);
  }

  onSubmitOrderPlan(): void {
    if (!this.orderPlanId?.trim()) return;
    const dto: CreateSubscriptionDto = {
      planId: this.orderPlanId.trim(),
      autoBackorder: this.orderAutoBackorder,
    };
    this.subscriptionsFacade.createSubscription(dto);
  }

  openCancelConfirm(sub: SubscriptionResponse): void {
    this.subscriptionToCancel = sub;
    this.showModal(this.cancelSubscriptionModal);
  }

  confirmCancelSubscription(): void {
    if (this.subscriptionToCancel) {
      this.subscriptionsFacade.cancelSubscription(this.subscriptionToCancel.id);
      this.subscriptionToCancel = null;
      this.hideModal(this.cancelSubscriptionModal);
    }
  }

  openResumeConfirm(sub: SubscriptionResponse): void {
    this.subscriptionToResume = sub;
    this.showModal(this.resumeConfirmModal);
  }

  confirmResume(): void {
    if (this.subscriptionToResume) {
      this.subscriptionsFacade.resumeSubscription(this.subscriptionToResume.id);
      this.subscriptionToResume = null;
      this.hideModal(this.resumeConfirmModal);
    }
  }

  retryBackorder(bo: BackorderResponse): void {
    this.backordersFacade.retryBackorder(bo.id);
  }

  openCancelBackorderConfirm(bo: BackorderResponse): void {
    this.backorderToCancel = bo;
    this.showModal(this.cancelBackorderModal);
  }

  confirmCancelBackorder(): void {
    if (this.backorderToCancel) {
      this.backordersFacade.cancelBackorder(this.backorderToCancel.id);
      this.backorderToCancel = null;
      this.hideModal(this.cancelBackorderModal);
    }
  }

  openEditProfileModal(): void {
    this.customerProfileFacade
      .getCustomerProfile$()
      .pipe(take(1))
      .subscribe((profile) => {
        this.profileForm = {
          firstName: profile?.firstName ?? undefined,
          lastName: profile?.lastName ?? undefined,
          company: profile?.company ?? undefined,
          addressLine1: profile?.addressLine1 ?? undefined,
          addressLine2: profile?.addressLine2 ?? undefined,
          postalCode: profile?.postalCode ?? undefined,
          city: profile?.city ?? undefined,
          state: profile?.state ?? undefined,
          country: profile?.country ?? undefined,
          email: profile?.email ?? undefined,
          phone: profile?.phone ?? undefined,
        };
        this.showModal(this.editProfileModal);
      });
  }

  onSubmitProfile(): void {
    this.customerProfileFacade.updateCustomerProfile(this.profileForm);
  }

  private showModal(modalElement: ElementRef<HTMLDivElement>): void {
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
}
