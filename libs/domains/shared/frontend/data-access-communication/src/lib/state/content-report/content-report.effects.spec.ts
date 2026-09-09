import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, throwError } from 'rxjs';

import { ContentReportService } from '../../services/content-report.service';

import { submitContentReport, submitContentReportFailure, submitContentReportSuccess } from './content-report.actions';
import { normalizeContentReportError, submitContentReport$ } from './content-report.effects';

describe('normalizeContentReportError', () => {
  it('should extract string message from HttpErrorResponse body', () => {
    const error = new HttpErrorResponse({
      error: { message: 'Invalid captcha' },
      status: 400,
      statusText: 'Bad Request',
    });

    expect(normalizeContentReportError(error)).toBe('Invalid captcha');
  });
});

describe('submitContentReport$', () => {
  let actions$: Actions;
  let contentReportService: jest.Mocked<ContentReportService>;
  const payload = {
    reportType: 'dsa' as const,
    turnstileToken: 'token',
    name: 'Alex',
    email: 'alex@example.com',
    contentUrls: 'https://example.com/1',
    explanation: 'Illegal',
    goodFaithConfirmed: true,
  };

  beforeEach(() => {
    contentReportService = {
      submit: jest.fn(),
    } as unknown as jest.Mocked<ContentReportService>;

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        { provide: ContentReportService, useValue: contentReportService },
      ],
    });
  });

  it('dispatches success on submit', (done) => {
    contentReportService.submit.mockReturnValue(of({ accepted: true as const, referenceId: '11' }));
    actions$ = of(submitContentReport({ payload }));

    TestBed.runInInjectionContext(() => {
      submitContentReport$().subscribe((action) => {
        expect(action).toEqual(submitContentReportSuccess({ referenceId: '11' }));
        done();
      });
    });
  });

  it('dispatches failure on error', (done) => {
    contentReportService.submit.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: { message: 'Nope' }, status: 400 })),
    );
    actions$ = of(submitContentReport({ payload }));

    TestBed.runInInjectionContext(() => {
      submitContentReport$().subscribe((action) => {
        expect(action).toEqual(submitContentReportFailure({ error: 'Nope' }));
        done();
      });
    });
  });
});
