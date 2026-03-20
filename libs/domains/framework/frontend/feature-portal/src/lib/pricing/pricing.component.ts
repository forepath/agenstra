import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  LOCALE_ID,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { ServicePlansFacade } from '@forepath/framework/frontend/data-access-portal';
import { ENVIRONMENT, type Environment } from '@forepath/framework/frontend/util-configuration';

@Component({
  selector: 'framework-portal-pricing',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./pricing.component.scss'],
  templateUrl: './pricing.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalPricingComponent implements OnInit, AfterViewInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly environment = inject<Environment>(ENVIRONMENT);
  private readonly servicePlansFacade = inject(ServicePlansFacade);
  private readonly locale = inject(LOCALE_ID);

  @ViewChild('pricingCarousel') pricingCarousel!: ElementRef<HTMLDivElement>;
  @ViewChild('enterpriseCard') enterpriseCard!: ElementRef<HTMLDivElement>;

  isLastCardVisible = signal<boolean>(true);

  readonly cheapestOffering = toSignal(this.servicePlansFacade.getCheapestServicePlanOffering$(), {
    initialValue: null,
  });

  readonly cheapestOfferingLoading = toSignal(this.servicePlansFacade.getCheapestServicePlanOfferingLoading$(), {
    initialValue: false,
  });

  readonly billingBaseUrl = this.environment.production
    ? `${this.environment.billing.frontendUrl}/${this.locale}/subscriptions?order=true`
    : `${this.environment.billing.frontendUrl}/subscriptions?order=true`;

  ngOnInit(): void {
    this.servicePlansFacade.loadCheapestServicePlanOffering();
    this.titleService.setTitle(
      $localize`:@@featurePortalPricing-metaTitle:Agenstra Pricing - Flexible Plans for Every Team`,
    );
    this.metaService.addTags([
      {
        name: 'description',
        content: $localize`:@@featurePortalPricing-metaDescription:Choose the right Agenstra plan for your team. From open source to enterprise, we offer flexible licensing options to fit your needs.`,
      },
      {
        name: 'keywords',
        content:
          'Agenstra pricing, AI agent platform pricing, agent management pricing, self-hosted AI platform, enterprise AI agent pricing',
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
    ]);
  }

  ngAfterViewInit(): void {
    if (this.pricingCarousel.nativeElement) {
      this.pricingCarousel.nativeElement.scrollBy({
        left: this.enterpriseCard.nativeElement.offsetLeft,
        behavior: 'smooth',
      });
    }
  }

  scrollPricingCarousel(direction: 'left' | 'right'): void {
    if (this.pricingCarousel.nativeElement) {
      if (direction === 'left') {
        this.isLastCardVisible.set(false);
      } else {
        this.isLastCardVisible.set(true);
      }
      this.pricingCarousel.nativeElement.scrollBy({
        left:
          direction === 'left'
            ? -this.enterpriseCard.nativeElement.offsetLeft
            : this.enterpriseCard.nativeElement.offsetLeft,
        behavior: 'smooth',
      });
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.pricingCarousel.nativeElement) {
      this.isLastCardVisible.set(true);
      this.pricingCarousel.nativeElement.scrollBy({
        left: this.enterpriseCard.nativeElement.offsetLeft,
        behavior: 'smooth',
      });
    }
  }
}
