import { createAction, props } from '@ngrx/store';

import type { SubmitContentReportPayload } from '../../types/content-report.types';

export const submitContentReport = createAction(
  '[Content Report] Submit',
  props<{ payload: SubmitContentReportPayload }>(),
);

export const submitContentReportSuccess = createAction(
  '[Content Report] Submit Success',
  props<{ referenceId: string }>(),
);

export const submitContentReportFailure = createAction('[Content Report] Submit Failure', props<{ error: string }>());

export const resetContentReport = createAction('[Content Report] Reset');
