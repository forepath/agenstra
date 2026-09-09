import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { CONTENT_REPORT_FEATURE_KEY } from '../../constants/content-report.constants';

import { submitContentReport } from './content-report.actions';
import { ContentReportFacade } from './content-report.facade';
import { initialContentReportState } from './content-report.reducer';

describe('ContentReportFacade', () => {
  let facade: ContentReportFacade;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContentReportFacade,
        provideMockStore({
          initialState: {
            [CONTENT_REPORT_FEATURE_KEY]: initialContentReportState,
          },
        }),
      ],
    });

    facade = TestBed.inject(ContentReportFacade);
    store = TestBed.inject(MockStore);
  });

  it('dispatches submitContentReport', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    const payload = {
      reportType: 'dsa' as const,
      turnstileToken: 'token',
      contentUrls: 'https://example.com/1',
      explanation: 'Illegal',
      goodFaithConfirmed: true,
      name: 'Alex',
      email: 'alex@example.com',
    };

    facade.submit(payload);

    expect(dispatchSpy).toHaveBeenCalledWith(submitContentReport({ payload }));
  });
});
