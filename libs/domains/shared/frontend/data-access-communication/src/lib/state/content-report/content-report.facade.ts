import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import type { SubmitContentReportPayload } from '../../types/content-report.types';

import { resetContentReport, submitContentReport } from './content-report.actions';
import {
  selectContentReportError,
  selectContentReportReferenceId,
  selectContentReportSubmitted,
  selectContentReportSubmitting,
} from './content-report.selectors';

@Injectable()
export class ContentReportFacade {
  private readonly store = inject(Store);

  getSubmitting$(): Observable<boolean> {
    return this.store.select(selectContentReportSubmitting);
  }

  getSubmitted$(): Observable<boolean> {
    return this.store.select(selectContentReportSubmitted);
  }

  getReferenceId$(): Observable<string | null> {
    return this.store.select(selectContentReportReferenceId);
  }

  getError$(): Observable<string | null> {
    return this.store.select(selectContentReportError);
  }

  submit(payload: SubmitContentReportPayload): void {
    this.store.dispatch(submitContentReport({ payload }));
  }

  reset(): void {
    this.store.dispatch(resetContentReport());
  }
}
