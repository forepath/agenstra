import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthenticationFacade } from '@forepath/framework/frontend/data-access-billing-console';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'framework-billing-console-container',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
})
export class BillingConsoleContainerComponent implements OnInit {
  private readonly authenticationFacade = inject(AuthenticationFacade);
  protected readonly themeService = inject(ThemeService);

  readonly isAuthenticated$ = this.authenticationFacade.isAuthenticated$;
  readonly isAdmin$ = this.authenticationFacade.isAdmin$;
  readonly canAccessUserManager$ = this.authenticationFacade.canAccessUserManager$;
  readonly user$ = this.authenticationFacade.user$;

  ngOnInit(): void {
    this.authenticationFacade.checkAuthentication();
  }

  onLogout(): void {
    this.authenticationFacade.logout();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
