import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let notificationClicks$: Subject<{ notification: { data?: { url?: string } } }>;
  let swPush: { isEnabled: boolean; notificationClicks: Subject<{ notification: { data?: { url?: string } } }> };
  let navigateByUrl: jest.Mock;

  beforeEach(async () => {
    notificationClicks$ = new Subject();
    swPush = { isEnabled: true, notificationClicks: notificationClicks$ };
    navigateByUrl = jest.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: SwPush, useValue: swPush },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    }).compileComponents();
  });

  it(`should have as title 'frontend-agent-console'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.title).toEqual('frontend-agent-console');
  });

  it('initializes when SwPush is not available', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AppComponent] });

    const fixture = TestBed.createComponent(AppComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('does not subscribe to notification clicks when SwPush is disabled', () => {
    swPush.isEnabled = false;
    const subscribeSpy = jest.spyOn(notificationClicks$, 'subscribe');
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();

    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it('navigates using clientId and agentId query params from notification data', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();
    notificationClicks$.next({
      notification: { data: { url: 'https://app.example/clients?clientId=c1&agentId=a1' } },
    });

    expect(navigateByUrl).toHaveBeenCalledWith('/clients/c1/agents/a1');
  });

  it('navigates using same-origin pathname when query params are absent', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();
    notificationClicks$.next({
      notification: { data: { url: `${window.location.origin}/clients/c1/agents/a1` } },
    });

    expect(navigateByUrl).toHaveBeenCalledWith('/clients/c1/agents/a1');
  });

  it('ignores notification clicks without url data', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();
    notificationClicks$.next({ notification: { data: {} } });

    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('prepends slash when url cannot be parsed and has no leading slash', () => {
    const urlSpy = jest.spyOn(globalThis, 'URL').mockImplementation(() => {
      throw new TypeError('invalid url');
    });
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();
    notificationClicks$.next({ notification: { data: { url: 'relative-path' } } });

    expect(navigateByUrl).toHaveBeenCalledWith('/relative-path');
    urlSpy.mockRestore();
  });

  it('keeps path when url cannot be parsed and already starts with slash', () => {
    const urlSpy = jest.spyOn(globalThis, 'URL').mockImplementation(() => {
      throw new TypeError('invalid url');
    });
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();
    notificationClicks$.next({ notification: { data: { url: '/clients/c1/agents/a1' } } });

    expect(navigateByUrl).toHaveBeenCalledWith('/clients/c1/agents/a1');
    urlSpy.mockRestore();
  });

  it('navigates to pathname for cross-origin absolute urls', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();
    notificationClicks$.next({
      notification: { data: { url: 'https://other.example/clients/c1/agents/a1?foo=1' } },
    });

    expect(navigateByUrl).toHaveBeenCalledWith('/clients/c1/agents/a1?foo=1');
  });
});
