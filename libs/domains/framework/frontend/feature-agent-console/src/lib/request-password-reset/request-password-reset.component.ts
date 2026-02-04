import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AuthenticationFacade,
  requestPasswordResetSuccess,
} from '@forepath/framework/frontend/data-access-agent-console';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Actions, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { take, tap } from 'rxjs/operators';

@Component({
  selector: 'framework-agent-console-request-password-reset',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  styleUrls: ['./request-password-reset.component.scss'],
  templateUrl: './request-password-reset.component.html',
  standalone: true,
})
export class AgentConsoleRequestPasswordResetComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly authFacade = inject(AuthenticationFacade);
  private readonly environment = inject<Environment>(ENVIRONMENT);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  form!: FormGroup;
  requestingPasswordReset$: Observable<boolean> = this.authFacade.requestingPasswordReset$;
  error$: Observable<string | null> = this.authFacade.error$;
  successMessage$: Observable<string | null> = this.authFacade.successMessage$;

  get isUsersAuth(): boolean {
    return this.environment.authentication.type === 'users';
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.actions$
      .pipe(
        ofType(requestPasswordResetSuccess),
        take(1),
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.form.reset()),
      )
      .subscribe();
  }

  onSubmit(): void {
    if (this.form.valid) {
      const email = this.form.get('email')?.value;
      this.authFacade.requestPasswordReset(email);
    } else {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }

  onDismissSuccess(): void {
    this.authFacade.clearSuccessMessage();
  }

  onDismissError(): void {
    this.authFacade.clearError();
  }
}
