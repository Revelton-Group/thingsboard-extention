import { Component, DoCheck, Input } from '@angular/core';
import { RoomData, RoomDataService } from '../../../core/services/room-data.service';
import { TranslationService } from '../../../core/services/translation.service';

type Tone = 'plain' | 'ok' | 'warn' | 'alert' | 'off';

interface Cell {
  key: string;
  icon: string;
  label: string;
  value: string;
  tone: Tone;
  iconClass: string;
  text?: boolean;
}

const PILL_TONE: { [pillClass: string]: Tone } = {
  'pill-normal': 'ok',
  'pill-warning': 'warn',
  'pill-wait': 'warn',
  'pill-danger': 'alert',
  'pill-inactive': 'off',
};

const cell = (key: string, icon: string, label: string): Cell => ({
  key, icon, label, value: '--', tone: 'off', iconClass: 'icon-gray',
});

const statusTone = (status: string): Tone =>
  status === 'danger' ? 'alert' : status === 'warning' ? 'warn' : 'ok';

@Component({
  selector: 'tb-room-card-view',
  templateUrl: './room-card-view.component.html',
  styleUrls: ['./room-card-view.component.scss'],
  standalone: false,
})
export class RoomCardViewComponent implements DoCheck {
  @Input() room!: RoomData;
  @Input() title: string | null = '';

  readonly hero: Cell[] = [
    cell('temp', 'thermostat', 'TEMP'),
    cell('humid', 'water_drop', 'HUMID'),
    { ...cell('air', 'air', 'AIR'), text: true },
  ];

  readonly stats: Cell[] = [
    cell('thermo', 'local_fire_department', 'THERMO'),
    cell('window', 'window', 'WINDOW'),
    cell('check', 'meeting_room', 'CHECK'),
    cell('booked', 'event_available', 'BOOKED'),
    cell('water', 'waves', 'WATER'),
    cell('noise', 'volume_up', 'NOISE'),
  ];

  name = '';
  frame = 'normal';
  bellTone: Tone = 'ok';

  constructor(
    private roomDataService: RoomDataService,
    private translationService: TranslationService
  ) {}

  trackByKey(_index: number, c: Cell): string {
    return c.key;
  }

  ngDoCheck(): void {
    const r = this.room;
    if (!r) return;
    const s = r.sensorData;
    const has = r.hasData;
    const res = r.reservation;
    const t = this.translationService.t;

    this.name = this.title || `${t.room} ${s.roomNumber}`;
    this.frame = r.roomStatus === 'danger' ? 'danger' : r.roomStatus === 'warning' ? 'warning' : 'normal';
    this.bellTone = r.alarmCount > 0 ? ((r.sensorAlarmCount || 0) > 0 ? 'alert' : 'warn') : 'ok';    const [temp, humid, air] = this.hero;
    temp.label = t.tileTemp;
    humid.label = t.tileHumid;
    air.label = t.tileAir;
    const hasTemp = s.temperature != null;
    temp.value = hasTemp ? `${s.temperature.toFixed(1)}°` : '--';
    temp.tone = has.temperature ? (r.tempStatus === 'normal' ? 'plain' : statusTone(r.tempStatus)) : 'off';
    temp.iconClass = has.temperature ? 'icon-orange' : 'icon-gray';

    humid.value = has.humidity && s.humidity != null ? `${Math.round(s.humidity)}%` : '--';
    humid.tone = has.humidity ? (r.humStatus === 'normal' ? 'plain' : statusTone(r.humStatus)) : 'off';
    humid.iconClass = has.humidity ? 'icon-blue' : 'icon-gray';

    air.value = has.airQuality ? this.roomDataService.getAirQualityLabel(s.airQuality) : '--';
    air.tone = has.airQuality ? statusTone(r.airStatus) : 'off';
    air.iconClass = has.airQuality ? 'icon-green' : 'icon-gray';

    const [thermo, win, check, booked, water, noise] = this.stats;
    thermo.label = t.tileThermo;
    win.label = t.tileWindow;
    check.label = t.tileCheck;
    booked.label = t.tileBooked;
    water.label = t.tileWater;
    noise.label = t.tileNoise;

    const trv = r.trvAgg;
    const trvOff = trv.count === 0 || trv.worstStatus === 'off';
    thermo.value = trv.count > 0 ? trv.display : '--';
    thermo.tone = trvOff ? 'off' : trv.worstStatus === 'heating' ? 'warn' : trv.worstStatus === 'idle' ? 'ok' : 'plain';
    thermo.iconClass = trv.worstStatus === 'heating' ? 'icon-orange'
      : trv.worstStatus === 'idle' ? 'icon-cyan'
      : trvOff ? 'icon-gray' : 'icon-red';

    const wa = r.winAgg;
    win.value = wa.total > 0 ? wa.display : '--';
    win.tone = wa.total === 0 ? 'off' : wa.anyOpen ? 'warn' : 'ok';
    win.iconClass = wa.total > 0 ? 'icon-green' : 'icon-gray';

    check.value = res.checkDisplay === 'In' ? t.chkIn : res.checkDisplay === 'Out' ? t.chkOut : res.checkDisplay === 'Wait' ? t.chkWait : res.checkDisplay;
    check.tone = PILL_TONE[res.checkPillClass] || 'plain';
    check.iconClass = res.checkIconClass;

    booked.value = res.bookDisplay;
    booked.tone = PILL_TONE[res.bookPillClass] || 'plain';
    booked.iconClass = res.bookIconClass;

    water.value = !has.waterLeak ? '--' : s.waterLeak ? t.stLeak : t.stOk;
    water.tone = !has.waterLeak ? 'off' : s.waterLeak ? 'alert' : 'ok';
    water.iconClass = !has.waterLeak ? 'icon-gray' : s.waterLeak ? 'icon-red' : 'icon-blue';

    noise.value = has.noise && s.noise != null ? `${Math.round(s.noise)}dB` : '--';
    noise.tone = has.noise ? statusTone(r.noiseStatus) : 'off';
    noise.iconClass = !has.noise ? 'icon-gray' : noise.tone === 'alert' ? 'icon-red' : 'icon-purple';
  }
}
