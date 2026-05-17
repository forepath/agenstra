import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { SwPush } from '@angular/service-worker';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  title = 'frontend-agent-console';

  private readonly swPush = inject(SwPush, { optional: true });
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (!this.swPush?.isEnabled) {
      return;
    }

    this.swPush.notificationClicks.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ notification }) => {
      const rawUrl = (notification?.data as { url?: string } | undefined)?.url;

      if (!rawUrl) {
        return;
      }

      void this.router.navigateByUrl(this.resolveInAppPath(rawUrl));
    });
  }

  private resolveInAppPath(url: string): string {
    try {
      const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      const clientId = parsed.searchParams.get('clientId');
      const agentId = parsed.searchParams.get('agentId');

      if (clientId && agentId) {
        return `/clients/${clientId}/agents/${agentId}`;
      }

      if (parsed.origin === (typeof window !== 'undefined' ? window.location.origin : parsed.origin)) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return url.startsWith('/') ? url : `/${url}`;
    }
  }
}
