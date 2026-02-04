import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocaleService } from '@forepath/framework/frontend/util-configuration';

@Component({
  selector: 'framework-portal-container',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./container.component.scss'],
  templateUrl: './container.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalContainerComponent {
  protected readonly localeService = inject(LocaleService);

  /**
   * Mobile menu visibility
   */
  readonly mobileMenuOpen = signal<boolean>(false);

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
