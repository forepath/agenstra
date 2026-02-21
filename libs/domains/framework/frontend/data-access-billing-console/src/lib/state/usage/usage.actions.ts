import { createAction, props } from '@ngrx/store';
import type { UsageSummaryDto, CreateUsageRecordDto } from './usage.types';

export const loadUsageSummary = createAction('[Usage] Load Usage Summary', props<{ subscriptionId: string }>());

export const loadUsageSummarySuccess = createAction(
  '[Usage] Load Usage Summary Success',
  props<{ subscriptionId: string; summary: UsageSummaryDto }>(),
);

export const loadUsageSummaryFailure = createAction(
  '[Usage] Load Usage Summary Failure',
  props<{ subscriptionId: string; error: string }>(),
);

export const recordUsage = createAction('[Usage] Record Usage', props<{ dto: CreateUsageRecordDto }>());

export const recordUsageSuccess = createAction('[Usage] Record Usage Success');

export const recordUsageFailure = createAction('[Usage] Record Usage Failure', props<{ error: string }>());
