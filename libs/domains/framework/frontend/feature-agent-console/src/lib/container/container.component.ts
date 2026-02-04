import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthenticationFacade } from '@forepath/framework/frontend/data-access-agent-console';
import { combineLatest, map } from 'rxjs';
import { StandaloneLoadingService } from '../standalone-loading.service';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'framework-agent-console-container',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./container.component.scss'],
  templateUrl: './container.component.html',
  standalone: true,
})
export class AgentConsoleContainerComponent implements OnInit {
  private readonly authenticationFacade = inject(AuthenticationFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly standaloneLoadingService = inject(StandaloneLoadingService);
  protected readonly themeService = inject(ThemeService);

  /**
   * Observable indicating whether the user is authenticated
   */
  readonly isAuthenticated$ = this.authenticationFacade.isAuthenticated$;

  /**
   * True when the user can access the user manager (admin with users/keycloak auth).
   */
  readonly canAccessUserManager$ = this.authenticationFacade.canAccessUserManager$;

  /**
   * Display label for the current user's role. Admin for api-key auth, otherwise user.role capitalized.
   */
  readonly userRoleDisplay$ = combineLatest([
    this.authenticationFacade.isAuthenticated$,
    this.authenticationFacade.authenticationType$,
    this.authenticationFacade.user$,
  ]).pipe(
    map(([isAuthenticated, authType, user]) => {
      if (!isAuthenticated) return null;
      if (authType === 'api-key') return 'Admin';
      const role = user?.role;
      return role ? role.charAt(0).toUpperCase() + role.slice(1) : null;
    }),
  );

  /**
   * Signal indicating if we're in file-only mode (file query parameter is set)
   */
  readonly fileOnlyMode = toSignal(this.route.queryParams.pipe(map((params) => !!params['standalone'])), {
    initialValue: false,
  });

  /**
   * Signal indicating if standalone loading spinner should be shown
   */
  readonly showStandaloneLoading = this.standaloneLoadingService.isLoading;

  /**
   * Initialize component and check authentication status
   */
  ngOnInit(): void {
    this.authenticationFacade.checkAuthentication();

    // Check initial query params immediately
    const initialParams = this.route.snapshot.queryParams;
    const isStandalone = !!initialParams['standalone'];
    if (isStandalone) {
      this.standaloneLoadingService.setLoading(true);
    }

    // Watch for query parameter changes
    this.route.queryParams.subscribe((params) => {
      const isStandalone = !!params['standalone'];
      if (isStandalone) {
        this.standaloneLoadingService.setLoading(true);
      } else {
        this.standaloneLoadingService.setLoading(false);
      }
    });
  }

  /**
   * Handles logout action
   */
  onLogout(): void {
    this.authenticationFacade.logout();
  }

  /**
   * Open user manager in a new standalone window (like deployment manager)
   */
  onOpenUserManagerInNewWindow(): void {
    const baseUrl = window.location.origin;
    const usersPath = '/users';
    const queryParams = new URLSearchParams();
    queryParams.set('standalone', 'true');
    const url = `${baseUrl}${usersPath}?${queryParams.toString()}`;

    const screenWidth = window.screen.availWidth || window.screen.width;
    const screenHeight = window.screen.availHeight || window.screen.height;

    const windowFeatures = [
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'resizable=yes',
      'scrollbars=yes',
      `width=${screenWidth}`,
      `height=${screenHeight}`,
      `left=0`,
      `top=0`,
    ].join(',');

    window.open(url, '_blank', windowFeatures);
  }
}
