import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  CustomerProfilesFacade,
  SubscriptionsFacade,
  InvoicesFacade,
  CustomerProfileDto,
} from '@forepath/framework/frontend/data-access-billing-console';

@Component({
  selector: 'framework-billing-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss'],
})
export class BillingComponent implements OnInit {
  private readonly customerProfilesFacade = inject(CustomerProfilesFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly fb = inject(FormBuilder);

  readonly profile$ = this.customerProfilesFacade.profile$;
  readonly subscriptions$ = this.subscriptionsFacade.subscriptions$;
  readonly loading$ = this.customerProfilesFacade.loading$;
  readonly updating$ = this.customerProfilesFacade.updating$;
  readonly error$ = this.customerProfilesFacade.error$;

  readonly profileForm = this.fb.group({
    firstName: [''],
    lastName: [''],
    company: [''],
    address: [''],
    email: ['', [Validators.email]],
    phone: [''],
    country: [''],
  });

  selectedSubscriptionId: string | null = null;

  ngOnInit(): void {
    this.customerProfilesFacade.loadCustomerProfile();
    this.subscriptionsFacade.loadSubscriptions();
  }

  onSaveProfile(): void {
    if (this.profileForm.valid) {
      const formValue = this.profileForm.value;
      const dto: CustomerProfileDto = {
        firstName: formValue.firstName ?? undefined,
        lastName: formValue.lastName ?? undefined,
        company: formValue.company ?? undefined,
        address: formValue.address ?? undefined,
        email: formValue.email ?? undefined,
        phone: formValue.phone ?? undefined,
        country: formValue.country ?? undefined,
      };
      this.customerProfilesFacade.createOrUpdateCustomerProfile(dto);
    }
  }

  onSelectSubscription(subscriptionId: string): void {
    this.selectedSubscriptionId = subscriptionId;
    this.invoicesFacade.loadInvoices(subscriptionId);
  }

  onCreateInvoice(subscriptionId: string): void {
    this.invoicesFacade.createInvoice(subscriptionId, {});
  }
}
