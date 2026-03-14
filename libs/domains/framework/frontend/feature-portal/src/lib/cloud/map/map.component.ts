import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, NO_ERRORS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-cloud-map',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./map.component.scss'],
  templateUrl: './map.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
})
export class PortalCloudMapComponent {}
