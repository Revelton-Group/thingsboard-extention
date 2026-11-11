import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WidgetContext } from '@home/models/widget-component.models';
import { UtilityStateService } from './domain/services/utility-state.service';
import { ElectricityService } from './domain/services/electricity.service';
import { DashboardViewModel } from './core/models';
import { ThingsBoardTelemetryService } from './shared/services/thingsboard-telemetry.service';
import { EvChargerProcessor } from './domain/processors/ev-charger.processor';
import { ThemeService } from './shared/services/theme.service';

type ViewId = 'ev' | 'electricity';
const VIEWS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'ev', label: 'EV chargers', icon: 'ev_station' },
  { id: 'electricity', label: 'Electricity', icon: 'bolt' },
];
const VIEW_KEY = 'revelton_utility_view';

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
    ElectricityService,
  ],
})
export class ReveltonUtilityDashboardComponent implements OnInit, OnDestroy {
  @Input() ctx!: WidgetContext;

  private readonly destroy$ = new Subject<void>();

  vm: DashboardViewModel;
  views = VIEWS.slice(0, 1);
  view: ViewId = 'ev';
  /** The view the user chose in this session; wins over the stored one when the meters come back. */
  private picked: ViewId | null = null;

  constructor(
    private state: UtilityStateService,
    private electricity: ElectricityService,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService,
    private el: ElementRef<HTMLElement>,
  ) {}

  private detachTheme: (() => void) | null = null;

  ngOnInit(): void {
    this.detachTheme = this.themeService.attach(this.el.nativeElement);
    if (!this.ctx) return;
    this.state.viewModel$.pipe(takeUntil(this.destroy$)).subscribe(vm => {
      this.vm = vm;
      this.electricity.refresh();
      this.cdr.markForCheck();
    });
    this.electricity.state$.pipe(takeUntil(this.destroy$)).subscribe(s => {
      const available = s.status !== 'none';
      if (available === this.views.length > 1) return;
      this.views = available ? VIEWS : VIEWS.slice(0, 1);
      this.view = available && (this.picked ?? this.savedView()) === 'electricity' ? 'electricity' : 'ev';
      this.cdr.markForCheck();
    });
    this.state.init(this.ctx);
    this.electricity.init(this.ctx);
  }

  selectView(id: string): void {
    this.view = id === 'electricity' ? 'electricity' : 'ev';
    this.picked = this.view;
    try {
      localStorage.setItem(VIEW_KEY, this.view);
    } catch {
      // the choice is only a convenience
    }
  }

  private savedView(): string | null {
    try {
      return localStorage.getItem(VIEW_KEY);
    } catch {
      return null;
    }
  }

  onDataUpdated(): void {
    this.state.refresh();
  }

  updateSettings(): void {
    this.state.refresh();
  }

  ngOnDestroy(): void {
    this.detachTheme?.();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
