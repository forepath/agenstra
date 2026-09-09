import { createFeatureSelector, createSelector } from '@ngrx/store';

import { CONTENT_REPORT_FEATURE_KEY } from '../../constants/content-report.constants';

import type { ContentReportState } from './content-report.reducer';

export const selectContentReportState = createFeatureSelector<ContentReportState>(CONTENT_REPORT_FEATURE_KEY);

export const selectContentReportSubmitting = createSelector(selectContentReportState, (state) => state.submitting);

export const selectContentReportSubmitted = createSelector(selectContentReportState, (state) => state.submitted);

export const selectContentReportReferenceId = createSelector(selectContentReportState, (state) => state.referenceId);

export const selectContentReportError = createSelector(selectContentReportState, (state) => state.error);
