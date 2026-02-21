import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { BackordersFacade } from '@forepath/framework/frontend/data-access-billing-console';
import { BackorderStatus } from '@forepath/framework/frontend/data-access-billing-console';

@Component({
  selector: 'framework-billing-backorders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backorders.component.html',
  styleUrls: ['./backorders.component.scss'],
})
export class BackordersComponent implements OnInit {
  protected readonly backordersFacade = inject(BackordersFacade);

  readonly backorders$ = this.backordersFacade.backorders$;
  readonly loading$ = this.backordersFacade.loading$;

  readonly BackorderStatus = BackorderStatus;

  ngOnInit(): void {
    this.backordersFacade.loadBackorders();
  }

  onRetry(id: string): void {
    this.backordersFacade.retryBackorder(id);
  }

  onCancel(id: string): void {
    if (confirm('Are you sure you want to cancel this backorder?')) {
      this.backordersFacade.cancelBackorder(id);
    }
  }

  getStatusBadgeClass(status: BackorderStatus): string {
    switch (status) {
      case BackorderStatus.PENDING:
        return 'bg-warning';
      case BackorderStatus.RETRYING:
        return 'bg-info';
      case BackorderStatus.FULFILLED:
        return 'bg-success';
      case BackorderStatus.CANCELLED:
        return 'bg-secondary';
      case BackorderStatus.FAILED:
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }
}
