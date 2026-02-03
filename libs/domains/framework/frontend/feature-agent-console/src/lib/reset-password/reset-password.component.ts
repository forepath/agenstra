import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthenticationFacade } from '@forepath/framework/frontend/data-access-agent-console';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';

@Component({
  selector: 'framework-agent-console-reset-password',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  styleUrls: ['./reset-password.component.scss'],
  templateUrl: './reset-password.component.html',
  standalone: true,
})
export class AgentConsoleResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  protected readonly authFacade = inject(AuthenticationFacade);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  form!: FormGroup;
  resettingPassword$: Observable<boolean> = this.authFacade.resettingPassword$;
  error$: Observable<string | null> = this.authFacade.error$;
  successMessage$: Observable<string | null> = this.authFacade.successMessage$;

  get isUsersAuth(): boolean {
    return this.environment.authentication.type === 'users';
  }

  ngOnInit(): void {
    const tokenFromQuery = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = this.fb.group(
      {
        token: [tokenFromQuery, [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        newPasswordConfirmation: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
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
    if (this.form.valid) {
      const token = this.form.get('token')?.value;
      const newPassword = this.form.get('newPassword')?.value;
      this.authFacade.resetPassword(token, newPassword);
      this.form.reset({ token: this.route.snapshot.queryParamMap.get('token') ?? '' });
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
