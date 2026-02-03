import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthenticationFacade } from '@forepath/framework/frontend/data-access-agent-console';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { of } from 'rxjs';
import { AgentConsoleLoginComponent } from './login.component';

describe('AgentConsoleLoginComponent', () => {
  let component: AgentConsoleLoginComponent;
  let fixture: ComponentFixture<AgentConsoleLoginComponent>;
  let mockAuthFacade: jest.Mocked<Partial<AuthenticationFacade>>;
  let mockEnvironment: Environment;

  beforeEach(async () => {
    mockAuthFacade = {
      loading$: of(false),
      error$: of(null),
      login: jest.fn(),
      clearError: jest.fn(),
    };

    mockEnvironment = {
      production: false,
      controller: {
        restApiUrl: 'http://localhost:3100/api',
        websocketUrl: 'http://localhost:8081/clients',
      },
      authentication: {
        type: 'api-key',
      },
      chatModelOptions: {},
      editor: { openInNewWindow: true },
      deployment: { openInNewWindow: true },
      cookieConsent: { domain: 'localhost', privacyPolicyUrl: 'https://example.com/privacy' },
    };

    await TestBed.configureTestingModule({
      imports: [
        AgentConsoleLoginComponent,
        ReactiveFormsModule,
        RouterModule.forRoot([{ path: 'login', component: AgentConsoleLoginComponent }]),
      ],
      providers: [
        FormBuilder,
        { provide: AuthenticationFacade, useValue: mockAuthFacade },
        { provide: ENVIRONMENT, useValue: mockEnvironment },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentConsoleLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when authentication type is api-key', () => {
    it('should show API key form', () => {
      expect(component.isApiKeyAuth).toBe(true);
      expect(component.isUsersAuth).toBe(false);
      expect(component.loginForm.contains('apiKey')).toBe(true);
      expect(component.loginForm.contains('email')).toBe(false);
    });

    it('should call login with API key on submit', () => {
      component.loginForm.patchValue({ apiKey: 'test-api-key' });
      component.onSubmit();

      expect(mockAuthFacade.login).toHaveBeenCalledWith('test-api-key');
    });
  });

  describe('when authentication type is users', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [
          AgentConsoleLoginComponent,
          ReactiveFormsModule,
          RouterModule.forRoot([{ path: 'login', component: AgentConsoleLoginComponent }]),
        ],
        providers: [
          FormBuilder,
          { provide: AuthenticationFacade, useValue: mockAuthFacade },
          {
            provide: ENVIRONMENT,
            useValue: {
              ...mockEnvironment,
              authentication: { type: 'users' },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(AgentConsoleLoginComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should show email and password form', () => {
      expect(component.isUsersAuth).toBe(true);
      expect(component.isApiKeyAuth).toBe(false);
      expect(component.loginForm.contains('email')).toBe(true);
      expect(component.loginForm.contains('password')).toBe(true);
      expect(component.loginForm.contains('apiKey')).toBe(false);
    });

    it('should call login with email and password on submit', () => {
      component.loginForm.patchValue({ email: 'test@example.com', password: 'password123' });
      component.onSubmit();

      expect(mockAuthFacade.login).toHaveBeenCalledWith(undefined, 'test@example.com', 'password123');
    });
  });
});
