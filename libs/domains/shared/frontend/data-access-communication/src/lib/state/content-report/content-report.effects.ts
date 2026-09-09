import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';

import { ContentReportService } from '../../services/content-report.service';

import { submitContentReport, submitContentReportFailure, submitContentReportSuccess } from './content-report.actions';

export function normalizeContentReportError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message;

      if (Array.isArray(message)) {
        return message.map(String).join(', ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return 'An unexpected error occurred';
}

export const submitContentReport$ = createEffect(
  (actions$ = inject(Actions), contentReportService = inject(ContentReportService)) => {
    return actions$.pipe(
      ofType(submitContentReport),
      switchMap(({ payload }) =>
        contentReportService.submit(payload).pipe(
          map((response) => submitContentReportSuccess({ referenceId: response.referenceId })),
          catchError((error) => of(submitContentReportFailure({ error: normalizeContentReportError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
