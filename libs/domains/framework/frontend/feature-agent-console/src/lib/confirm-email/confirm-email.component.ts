import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthenticationFacade } from '@forepath/framework/frontend/data-access-agent-console';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';

@Component({
  selector: 'framework-agent-console-confirm-email',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  styleUrls: ['./confirm-email.component.scss'],
  templateUrl: './confirm-email.component.html',
  standalone: true,
})
export class AgentConsoleConfirmEmailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly authFacade = inject(AuthenticationFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  form!: FormGroup;
  confirmingEmail$: Observable<boolean> = this.authFacade.confirmingEmail$;
  error$: Observable<string | null> = this.authFacade.error$;
  successMessage$: Observable<string | null> = this.authFacade.successMessage$;

  get isUsersAuth(): boolean {
    return this.environment.authentication.type === 'users';
  }

  ngOnInit(): void {
    const tokenFromQuery = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = this.fb.group({
      token: [tokenFromQuery, [Validators.required]],
    });

    if (this.isUsersAuth && tokenFromQuery) {
      this.authFacade.confirmEmail(tokenFromQuery);
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      const token = this.form.get('token')?.value;
      this.authFacade.confirmEmail(token);
      this.form.reset({ token: this.route.snapshot.queryParamMap.get('token') ?? '' });
    } else {
      this.form.get('token')?.markAsTouched();
    }
  }

  onDismissSuccess(): void {
    this.authFacade.clearSuccessMessage();
  }

  onDismissError(): void {
    this.authFacade.clearError();
  }
}
