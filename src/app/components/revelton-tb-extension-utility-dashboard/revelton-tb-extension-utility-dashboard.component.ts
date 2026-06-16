import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetContext } from '@home/models/widget-component.models';
import { UtilityStateService } from './domain/services/utility-state.service';
import { DashboardViewModel } from './core/models';
import { ThingsBoardTelemetryService } from '../revelton-tb-extension-historical-dashboard/data/services/thingsboard-telemetry.service';
import { EvChargerProcessor } from './domain/processors/ev-charger.processor';

@Component({
  selector: 'revelton-utility-dashboard',
  templateUrl: './revelton-tb-extension-utility-dashboard.component.html',
  styleUrls: ['./revelton-tb-extension-utility-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  providers: [
    UtilityStateService,
    ThingsBoardTelemetryService,
    EvChargerProcessor,
  ],
})
export class ReveltonUtilityDashboardComponent implements OnInit, OnDestroy {
  @Input() ctx!: WidgetContext;

  private readonly destroy$ = new Subject<void>();

  vm: DashboardViewModel;

  constructor(
    private state: UtilityStateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.ctx) return;
    this.state.viewModel$.pipe(takeUntil(this.destroy$)).subscribe(vm => {
      this.vm = vm;
      this.cdr.markForCheck();
    });
    this.state.init(this.ctx);
  }

  onDataUpdated(): void {
    this.state.refresh();
  }

  updateSettings(): void {
    this.state.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
