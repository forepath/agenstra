import { createReducer, on } from '@ngrx/store';

import {
  resetContentReport,
  submitContentReport,
  submitContentReportFailure,
  submitContentReportSuccess,
} from './content-report.actions';

export interface ContentReportState {
  submitting: boolean;
  submitted: boolean;
  referenceId: string | null;
  error: string | null;
}

export const initialContentReportState: ContentReportState = {
  submitting: false,
  submitted: false,
  referenceId: null,
  error: null,
};

export const contentReportReducer = createReducer(
  initialContentReportState,
  on(submitContentReport, (state) => ({
    ...state,
    submitting: true,
    submitted: false,
    referenceId: null,
    error: null,
  })),
  on(submitContentReportSuccess, (state, { referenceId }) => ({
    ...state,
    submitting: false,
    submitted: true,
    referenceId,
    error: null,
  })),
  on(submitContentReportFailure, (state, { error }) => ({
    ...state,
    submitting: false,
    submitted: false,
    referenceId: null,
    error,
  })),
  on(resetContentReport, () => initialContentReportState),
);
