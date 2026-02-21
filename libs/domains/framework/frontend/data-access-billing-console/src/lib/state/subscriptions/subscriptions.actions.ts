import { createAction, props } from '@ngrx/store';
import type {
  SubscriptionResponseDto,
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  ResumeSubscriptionDto,
} from './subscriptions.types';

export const loadSubscriptions = createAction('[Subscriptions] Load Subscriptions');

export const loadSubscriptionsSuccess = createAction(
  '[Subscriptions] Load Subscriptions Success',
  props<{ subscriptions: SubscriptionResponseDto[] }>(),
);

export const loadSubscriptionsFailure = createAction(
  '[Subscriptions] Load Subscriptions Failure',
  props<{ error: string }>(),
);

export const loadSubscription = createAction('[Subscriptions] Load Subscription', props<{ id: string }>());

export const loadSubscriptionSuccess = createAction(
  '[Subscriptions] Load Subscription Success',
  props<{ subscription: SubscriptionResponseDto }>(),
);

export const loadSubscriptionFailure = createAction(
  '[Subscriptions] Load Subscription Failure',
  props<{ error: string }>(),
);

export const createSubscription = createAction(
  '[Subscriptions] Create Subscription',
  props<{ dto: CreateSubscriptionDto }>(),
);

export const createSubscriptionSuccess = createAction(
  '[Subscriptions] Create Subscription Success',
  props<{ subscription: SubscriptionResponseDto }>(),
);

export const createSubscriptionFailure = createAction(
  '[Subscriptions] Create Subscription Failure',
  props<{ error: string }>(),
);

export const cancelSubscription = createAction(
  '[Subscriptions] Cancel Subscription',
  props<{ id: string; dto: CancelSubscriptionDto }>(),
);

export const cancelSubscriptionSuccess = createAction(
  '[Subscriptions] Cancel Subscription Success',
  props<{ subscription: SubscriptionResponseDto }>(),
);

export const cancelSubscriptionFailure = createAction(
  '[Subscriptions] Cancel Subscription Failure',
  props<{ error: string }>(),
);

export const resumeSubscription = createAction(
  '[Subscriptions] Resume Subscription',
  props<{ id: string; dto: ResumeSubscriptionDto }>(),
);

export const resumeSubscriptionSuccess = createAction(
  '[Subscriptions] Resume Subscription Success',
  props<{ subscription: SubscriptionResponseDto }>(),
);

export const resumeSubscriptionFailure = createAction(
  '[Subscriptions] Resume Subscription Failure',
  props<{ error: string }>(),
);
