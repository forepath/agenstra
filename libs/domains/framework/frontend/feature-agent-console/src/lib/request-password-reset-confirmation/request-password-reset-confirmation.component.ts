import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthenticationFacade, resetPasswordSuccess } from '@forepath/framework/frontend/data-access-agent-console';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Actions, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { OtpInputComponent } from '../otp-input/otp-input.component';

@Component({
  selector: 'framework-agent-console-request-password-reset-confirmation',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, OtpInputComponent],
  styleUrls: ['./request-password-reset-confirmation.component.scss'],
  templateUrl: './request-password-reset-confirmation.component.html',
  standalone: true,
})
export class AgentConsoleRequestPasswordResetConfirmationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  protected readonly authFacade = inject(AuthenticationFacade);
  private readonly environment = inject<Environment>(ENVIRONMENT);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  form!: FormGroup;
  formSubmitted = false;
  successMessage$: Observable<string | null> = this.authFacade.successMessage$;
  error$: Observable<string | null> = this.authFacade.error$;
  resettingPassword$: Observable<boolean> = this.authFacade.resettingPassword$;

  get isUsersAuth(): boolean {
    return this.environment.authentication.type === 'users';
  }

  ngOnInit(): void {
    const emailFromQuery = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.form = this.fb.group(
      {
        email: [emailFromQuery, [Validators.required, Validators.email]],
        code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{6}$/)]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        newPasswordConfirmation: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );

    this.actions$
      .pipe(
        ofType(resetPasswordSuccess),
        take(1),
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.formSubmitted = false;
          this.form.reset({
            email: this.route.snapshot.queryParamMap.get('email') ?? '',
            code: '',
            newPassword: '',
            newPasswordConfirmation: '',
          });
        }),
      )
      .subscribe();
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const passwordConfirmation = group.get('newPasswordConfirmation')?.value;
    if (password && passwordConfirmation && password !== passwordConfirmation) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    this.formSubmitted = true;
    if (this.form.valid) {
      const email = this.form.get('email')?.value;
      const code = this.form.get('code')?.value;
      const newPassword = this.form.get('newPassword')?.value;
      this.authFacade.resetPassword(email, code, newPassword);
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
