import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthenticationFacade, loginSuccess } from '@forepath/framework/frontend/data-access-agent-console';
import type { Environment, UsersAuthenticationConfig } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Actions, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { take, tap } from 'rxjs/operators';

@Component({
  selector: 'framework-agent-console-login',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  standalone: true,
})
export class AgentConsoleLoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly authFacade = inject(AuthenticationFacade);
  private readonly environment = inject<Environment>(ENVIRONMENT);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  loginForm!: FormGroup;
  loading$: Observable<boolean> = this.authFacade.loading$;
  error$: Observable<string | null> = this.authFacade.error$;
  successMessage$: Observable<string | null> = this.authFacade.successMessage$;

  /**
   * Whether the current authentication type is user-based (email/password)
   */
  get isUsersAuth(): boolean {
    return this.environment.authentication.type === 'users';
  }

  /**
   * Whether the current authentication type is API key
   */
  get isApiKeyAuth(): boolean {
    return this.environment.authentication.type === 'api-key';
  }

  /**
   * Whether signup is disabled (users auth only). When true, the "Create an account" link is hidden.
   */
  get isSignupDisabled(): boolean {
    return (
      this.environment.authentication.type === 'users' &&
      (this.environment.authentication as UsersAuthenticationConfig).disableSignup === true
    );
  }

  /**
   * Get the API base hostname from the environment configuration.
   * Extracts only the hostname and port (without protocol or path).
   */
  get apiBaseHostname(): string {
    const apiUrl = this.environment.controller.restApiUrl;
    try {
      const url = new URL(apiUrl);
      return url.host;
    } catch {
      // Fallback if URL parsing fails - try to extract hostname manually
      const match = apiUrl.match(/\/\/([^/]+)/);
      return match ? match[1] : apiUrl;
    }
  }

  ngOnInit(): void {
    if (this.isUsersAuth) {
      this.loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
      });
    } else {
      this.loginForm = this.fb.group({
        apiKey: ['', [Validators.required]],
      });
    }

    this.actions$
      .pipe(
        ofType(loginSuccess),
        take(1),
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loginForm.reset()),
      )
      .subscribe();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      if (this.isUsersAuth) {
        const email = this.loginForm.get('email')?.value;
        const password = this.loginForm.get('password')?.value;
        this.authFacade.login(undefined, email, password);
      } else {
        const apiKey = this.loginForm.get('apiKey')?.value;
        this.authFacade.login(apiKey);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }
}
