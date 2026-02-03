import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthenticationFacade } from '@forepath/framework/frontend/data-access-agent-console';
import { LocaleService } from '@forepath/framework/frontend/util-configuration';
import { of } from 'rxjs';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  let mockRouter: jest.Mocked<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let mockLocaleService: jest.Mocked<Partial<LocaleService>>;

  const setupTestBed = (canAccess: boolean): Injector => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthenticationFacade,
          useValue: {
            checkAuthentication: jest.fn(),
            canAccessUserManager$: of(canAccess),
          },
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
    return TestBed.inject(Injector);
  };

  beforeEach(() => {
    mockRouter = {
      createUrlTree: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {} as RouterStateSnapshot;

    mockLocaleService = {
      buildAbsoluteUrl: jest.fn((path: string[]) => path),
    };

    jest.clearAllMocks();
  });

  it('should allow access when canAccessUserManager is true', (done) => {
    const injector = setupTestBed(true);

    runInInjectionContext(injector, () => {
      const result = adminGuard(mockRoute, mockState);
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res) => {
          expect(res).toBe(true);
          expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
          done();
        });
      } else {
        expect(result).toBe(true);
        done();
      }
    });
  });

  it('should redirect to /clients when canAccessUserManager is false', (done) => {
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree = jest.fn().mockReturnValue(mockUrlTree);
    const injector = setupTestBed(false);

    runInInjectionContext(injector, () => {
      const result = adminGuard(mockRoute, mockState);
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((res) => {
          expect(res).toBe(mockUrlTree);
          expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/clients']);
          done();
        });
      } else {
        expect(result).toBe(mockUrlTree);
        done();
      }
    });
  });
});
