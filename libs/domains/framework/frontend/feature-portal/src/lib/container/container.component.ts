import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
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
   * True when the user has scrolled the page
   */
  readonly isScrolled = signal<boolean>(false);

  /**
   * Check if the user has scrolled the page
   */
  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 0);
  }

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
