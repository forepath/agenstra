import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT, LocaleService } from '@forepath/framework/frontend/util-configuration';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { KeycloakService } from 'keycloak-angular';
import { of, throwError } from 'rxjs';
import {
  checkAuthentication,
  checkAuthenticationFailure,
  checkAuthenticationSuccess,
  confirmEmailSuccess,
  loadUsers,
  loadUsersBatch,
  loadUsersFailure,
  loadUsersSuccess,
  login,
  loginFailure,
  loginSuccess,
  logout,
  logoutFailure,
  logoutSuccess,
  registerSuccess,
  requestPasswordResetSuccess,
  resetPasswordSuccess,
} from './authentication.actions';
import {
  checkAuthentication$,
  confirmEmailSuccessRedirect$,
  loadUsers$,
  loadUsersBatch$,
  login$,
  loginSuccessRedirect$,
  logout$,
  logoutSuccessRedirect$,
  registerSuccessRedirect$,
  requestPasswordResetSuccessRedirect$,
  resetPasswordSuccessRedirect$,
} from './authentication.effects';
import type { UserResponseDto } from './authentication.types';

// Mock KeycloakService to avoid ES module import issues in Jest
jest.mock('keycloak-angular', () => ({
  KeycloakService: jest.fn(),
  LocaleService: jest.fn(),
}));

describe('AuthenticationEffects', () => {
  let actions$: Actions;
  let mockEnvironment: Environment;
  let mockKeycloakService: jest.Mocked<Partial<KeycloakService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;
  let mockLocaleService: jest.Mocked<Partial<LocaleService>>;

  const API_KEY_STORAGE_KEY = 'agent-controller-api-key';

  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    mockEnvironment = {
      production: false,
      controller: {
        restApiUrl: 'http://localhost:3100/api',
        websocketUrl: 'http://localhost:8081/clients',
      },
      authentication: {
        type: 'api-key',
      },
      chatModelOptions: {
        cursor: {
          'composer-1': 'Composer 1',
        },
        opencode: {
          'gpt-4o': 'GPT-4o',
        },
      },
      editor: {
        openInNewWindow: true,
      },
      deployment: {
        openInNewWindow: true,
      },
      cookieConsent: {
        domain: 'localhost',
        privacyPolicyUrl: 'https://example.com/privacy',
      },
    };

    mockKeycloakService = {
      login: jest.fn(),
      logout: jest.fn(),
      isLoggedIn: jest.fn(),
    };

    mockLocaleService = {
      buildAbsoluteUrl: jest.fn(),
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        {
          provide: ENVIRONMENT,
          useValue: mockEnvironment,
        },
        {
          provide: KeycloakService,
          useValue: mockKeycloakService,
        },
        {
          provide: Router,
          useValue: mockRouter,
        },
        {
          provide: LocaleService,
          useValue: mockLocaleService,
        },
      ],
    });

    actions$ = TestBed.inject(Actions);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    (window.localStorage.getItem as jest.Mock).mockClear();
    (window.localStorage.setItem as jest.Mock).mockClear();
    (window.localStorage.removeItem as jest.Mock).mockClear();
  });

  describe('login$', () => {
    describe('when authentication type is api-key', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
            apiKey: 'env-api-key',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should store API key from payload in localStorage and return loginSuccess', (done) => {
        const action = login({ apiKey: 'test-api-key' });
        const outcome = loginSuccess({ authenticationType: 'api-key' });

        actions$ = of(action);

        login$(actions$, mockEnvironment, mockKeycloakService as any, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.setItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY, 'test-api-key');
          done();
        });
      });

      it('should use environment API key if payload apiKey is not provided', (done) => {
        const action = login({});
        const outcome = loginSuccess({ authenticationType: 'api-key' });

        actions$ = of(action);

        login$(actions$, mockEnvironment, mockKeycloakService as any, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.setItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY, 'env-api-key');
          done();
        });
      });

      it('should return loginFailure if no API key is available', (done) => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
          },
        };
        const action = login({});
        const outcome = loginFailure({ error: 'API key is required for authentication' });

        actions$ = of(action);

        login$(actions$, mockEnvironment, mockKeycloakService as any, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.setItem).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when authentication type is keycloak', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'keycloak',
            authServerUrl: 'http://localhost:8080',
            realm: 'test-realm',
            clientId: 'test-client',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should call KeycloakService.login and return loginSuccess', (done) => {
        const action = login({});
        const outcome = loginSuccess({ authenticationType: 'keycloak' });

        actions$ = of(action);
        mockKeycloakService.login = jest.fn().mockResolvedValue(undefined);

        login$(actions$, mockEnvironment, mockKeycloakService as any, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(mockKeycloakService.login).toHaveBeenCalled();
          done();
        });
      });

      it('should return loginFailure on Keycloak login error', (done) => {
        const action = login({});
        const error = new Error('Keycloak login failed');
        const outcome = loginFailure({ error: 'Keycloak login failed' });

        actions$ = of(action);
        mockKeycloakService.login = jest.fn().mockRejectedValue(error);

        login$(actions$, mockEnvironment, mockKeycloakService as any, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });

      it('should return loginFailure if KeycloakService is not available', (done) => {
        const action = login({});
        const outcome = loginFailure({ error: 'Authentication service not available' });

        actions$ = of(action);

        login$(actions$, mockEnvironment, null, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });
    });
  });

  describe('logout$', () => {
    describe('when authentication type is api-key', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should remove API key from localStorage and return logoutSuccess', (done) => {
        const action = logout();
        const outcome = logoutSuccess();

        actions$ = of(action);

        logout$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.removeItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY);
          done();
        });
      });
    });

    describe('when authentication type is keycloak', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'keycloak',
            authServerUrl: 'http://localhost:8080',
            realm: 'test-realm',
            clientId: 'test-client',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should call KeycloakService.logout and return logoutSuccess', (done) => {
        const action = logout();
        const outcome = logoutSuccess();

        actions$ = of(action);
        mockKeycloakService.logout = jest.fn().mockResolvedValue(undefined);

        logout$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(mockKeycloakService.logout).toHaveBeenCalled();
          done();
        });
      });

      it('should return logoutFailure on Keycloak logout error', (done) => {
        const action = logout();
        const error = new Error('Keycloak logout failed');
        const outcome = logoutFailure({ error: 'Keycloak logout failed' });

        actions$ = of(action);
        mockKeycloakService.logout = jest.fn().mockRejectedValue(error);

        logout$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });

      it('should return logoutSuccess if KeycloakService is not available', (done) => {
        const action = logout();
        const outcome = logoutSuccess();

        actions$ = of(action);

        logout$(actions$, mockEnvironment, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });
    });
  });

  describe('checkAuthentication$', () => {
    describe('when authentication type is api-key', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
            apiKey: 'env-api-key',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should return checkAuthenticationSuccess with true and authenticationType if API key exists in environment', (done) => {
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: true, authenticationType: 'api-key' });

        actions$ = of(action);
        (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });

      it('should return checkAuthenticationSuccess with true and authenticationType if API key exists in localStorage', (done) => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
          },
        };
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: true, authenticationType: 'api-key' });

        actions$ = of(action);
        (window.localStorage.getItem as jest.Mock).mockReturnValue('stored-api-key');

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.getItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY);
          done();
        });
      });

      it('should return checkAuthenticationSuccess with false if no API key exists', (done) => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
          },
        };
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: false });

        actions$ = of(action);
        (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });
    });

    describe('when authentication type is keycloak', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'keycloak',
            authServerUrl: 'http://localhost:8080',
            realm: 'test-realm',
            clientId: 'test-client',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should return checkAuthenticationSuccess with true and authenticationType if user is logged in', (done) => {
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: true, authenticationType: 'keycloak' });

        actions$ = of(action);
        mockKeycloakService.isLoggedIn = jest.fn().mockReturnValue(true);

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(mockKeycloakService.isLoggedIn).toHaveBeenCalled();
          done();
        });
      });

      it('should return checkAuthenticationSuccess with false if user is not logged in', (done) => {
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: false });

        actions$ = of(action);
        mockKeycloakService.isLoggedIn = jest.fn().mockReturnValue(false);

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(mockKeycloakService.isLoggedIn).toHaveBeenCalled();
          done();
        });
      });

      it('should return checkAuthenticationFailure on error', (done) => {
        const action = checkAuthentication();
        const error = new Error('Check failed');
        const outcome = checkAuthenticationFailure({ error: 'Check failed' });

        actions$ = of(action);
        mockKeycloakService.isLoggedIn = jest.fn().mockImplementation(() => {
          throw error;
        });

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });

      it('should return checkAuthenticationSuccess with false if KeycloakService is not available', (done) => {
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: false });

        actions$ = of(action);

        checkAuthentication$(actions$, mockEnvironment, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });
    });
  });

  describe('loginSuccessRedirect$', () => {
    it('should navigate to /clients when loginSuccess action is dispatched', (done) => {
      const action = loginSuccess({ authenticationType: 'api-key' });

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/clients']);

      loginSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/clients']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/clients']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it('should navigate to /clients for keycloak authentication type', (done) => {
      const action = loginSuccess({ authenticationType: 'keycloak' });

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/clients']);

      loginSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/clients']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/clients']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });

  describe('registerSuccessRedirect$', () => {
    it('should navigate to /confirm-email when registerSuccess action is dispatched', (done) => {
      const action = registerSuccess({
        user: { id: 'user-1', email: 'test@example.com', role: 'user' },
        message: 'Registration successful',
      });

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/confirm-email']);

      registerSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/confirm-email']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/confirm-email']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });

  describe('requestPasswordResetSuccessRedirect$', () => {
    it('should navigate to /request-password-reset-confirmation when requestPasswordResetSuccess action is dispatched', (done) => {
      const action = requestPasswordResetSuccess({ email: 'user@example.com' });

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/request-password-reset-confirmation']);

      requestPasswordResetSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/request-password-reset-confirmation']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/request-password-reset-confirmation'], {
            queryParams: { email: 'user@example.com' },
          });
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });

  describe('resetPasswordSuccessRedirect$', () => {
    it('should navigate to /login when resetPasswordSuccess action is dispatched', (done) => {
      const action = resetPasswordSuccess();

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/login']);

      resetPasswordSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/login']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });

  describe('confirmEmailSuccessRedirect$', () => {
    it('should navigate to /login when confirmEmailSuccess action is dispatched', (done) => {
      const action = confirmEmailSuccess();

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/login']);

      confirmEmailSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/login']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });

  describe('logoutSuccessRedirect$', () => {
    it('should navigate to /login when logoutSuccess action is dispatched', (done) => {
      const action = logoutSuccess();

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/login']);

      logoutSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/login']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });

  describe('loadUsers$', () => {
    const mockAuthService = {
      listUsers: jest.fn(),
    } as any;

    const mockUser: UserResponseDto = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'user',
      emailConfirmedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should return loadUsersSuccess when batch is empty', (done) => {
      const users: UserResponseDto[] = [];
      const action = loadUsers({});
      const outcome = loadUsersSuccess({ users: [] });

      actions$ = of(action);
      mockAuthService.listUsers.mockReturnValue(of(users));

      loadUsers$(actions$, mockAuthService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(mockAuthService.listUsers).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('should return loadUsersSuccess when batch is partial (< 10)', (done) => {
      const users: UserResponseDto[] = [mockUser];
      const action = loadUsers({});
      const outcome = loadUsersSuccess({ users });

      actions$ = of(action);
      mockAuthService.listUsers.mockReturnValue(of(users));

      loadUsers$(actions$, mockAuthService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(mockAuthService.listUsers).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('should return loadUsersBatch when batch is full (10 entries)', (done) => {
      const users: UserResponseDto[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockUser,
        id: `user-${i}`,
      }));
      const action = loadUsers({});
      const outcome = loadUsersBatch({ offset: 10, accumulatedUsers: users });

      actions$ = of(action);
      mockAuthService.listUsers.mockReturnValue(of(users));

      loadUsers$(actions$, mockAuthService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(mockAuthService.listUsers).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('should return loadUsersFailure on error', (done) => {
      const action = loadUsers({});
      const error = new Error('Load failed');
      const outcome = loadUsersFailure({ error: 'Load failed' });

      actions$ = of(action);
      mockAuthService.listUsers.mockReturnValue(throwError(() => error));

      loadUsers$(actions$, mockAuthService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadUsersBatch$', () => {
    const mockAuthService = {
      listUsers: jest.fn(),
    } as any;

    const mockUser: UserResponseDto = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'user',
      emailConfirmedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should return loadUsersSuccess when batch is empty', (done) => {
      const accumulatedUsers: UserResponseDto[] = [mockUser];
      const newUsers: UserResponseDto[] = [];
      const action = loadUsersBatch({ offset: 10, accumulatedUsers });
      const outcome = loadUsersSuccess({ users: accumulatedUsers });

      actions$ = of(action);
      mockAuthService.listUsers.mockReturnValue(of(newUsers));

      loadUsersBatch$(actions$, mockAuthService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(mockAuthService.listUsers).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        done();
      });
    });

    it('should return loadUsersSuccess when batch is partial (< 10)', (done) => {
      const accumulatedUsers: UserResponseDto[] = [mockUser];
      const newUsers: UserResponseDto[] = [{ ...mockUser, id: 'user-2' }];
      const action = loadUsersBatch({ offset: 10, accumulatedUsers });
      const outcome = loadUsersSuccess({ users: [...accumulatedUsers, ...newUsers] });

      actions$ = of(action);
      mockAuthService.listUsers.mockReturnValue(of(newUsers));

      loadUsersBatch$(actions$, mockAuthService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(mockAuthService.listUsers).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        done();
      });
    });

    it('should return loadUsersBatch when batch is full (10 entries)', (done) => {
      const accumulatedUsers: UserResponseDto[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockUser,
        id: `user-${i}`,
      }));
      const newUsers: UserResponseDto[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockUser,
        id: `user-${i + 10}`,
      }));
      const action = loadUsersBatch({ offset: 10, accumulatedUsers });
      const outcome = loadUsersBatch({
        offset: 20,
        accumulatedUsers: [...accumulatedUsers, ...newUsers],
      });

      actions$ = of(action);
      mockAuthService.listUsers.mockReturnValue(of(newUsers));

      loadUsersBatch$(actions$, mockAuthService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(mockAuthService.listUsers).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        done();
      });
    });

    it('should return loadUsersFailure on error', (done) => {
      const accumulatedUsers: UserResponseDto[] = [mockUser];
      const action = loadUsersBatch({ offset: 10, accumulatedUsers });
      const error = new Error('Load failed');
      const outcome = loadUsersFailure({ error: 'Load failed' });

      actions$ = of(action);
      mockAuthService.listUsers.mockReturnValue(throwError(() => error));

      loadUsersBatch$(actions$, mockAuthService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });
});
