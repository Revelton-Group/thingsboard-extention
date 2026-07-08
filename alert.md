# Room Card Alert / Border Color Logic

Source: `src/app/components/revelton-tb-extension-dashboard/core/services/room-data.service.ts`

## Where the border color comes from

`RoomDataService.updateStatuses()` (around line 971) computes `data.roomStatus`, which the room card template binds via `[ngClass]` to `.status-warning` / `.status-danger` (`room-card.component.html`), styled in `room-card.component.scss` (`.status-danger { border-color: var(--color-danger); }`).

```ts
const s = [
  data.tempStatus,
  data.humStatus,
  data.airStatus,
  data.noiseStatus,
  data.sensorData.waterLeak ? 'danger' : 'normal',
  hasBatteryLow ? 'warning' : 'normal'
];
data.roomStatus = s.includes('danger') ? 'danger'
                : s.includes('warning') ? 'warning'
                : 'normal';
```

**The red border is the WORST of 6 independent checks — not temperature alone:**

1. Temperature status
2. Humidity status
3. Air quality (CO2) status
4. Noise status
5. Water leak (any leak = instant `danger`, no threshold band)
6. Low battery (only ever contributes `warning`, never `danger`)

If **any one** of these hits `danger`, the whole card border turns red — regardless of what the other metrics look like.

## Threshold bands (not single cutoffs)

Defaults (`THRESHOLDS`, room-data.service.ts:105-115), overridden by Control Panel config (`config.airQuality`, `config.noise`) at lines 124-177:

| Metric | Warning band (default) | Danger band (default) | Config source |
|---|---|---|---|
| Temperature | 16–28°C | 14–32°C | `config.airQuality.tempMin/tempMax` → danger = `[tempMin-4, tempMax+4]` |
| Humidity | 30–65% | 20–80% | `config.airQuality.humMin/humMax` → danger = `[humMin-10, humMax+10]` |
| Air Quality (CO2) | 100 | 150 | if enabled: `warning = co2Max*0.8`, `danger = co2Max` |
| Noise | 55dB | 70dB | if enabled: `warning = max(40, laeqMax-10)`, `danger = laeqMax` |

`calcStatus()` (line 1013):
```ts
if (val < danger.min || val > danger.max) return 'danger';
if (val < warning.min || val > warning.max) return 'warning';
return 'normal';
```

### Important gotcha with a single "23" temperature setting

Setting only one side of the temperature config (e.g. a max of 23) still leaves the other side (`tempMin`, default 18) in effect. Since danger = `[tempMin-4, tempMax+4]`, a room can go **red for being too cold** (below 14 by default) even though you only intended to flag "too hot at 23+". Always check both `tempMin` and `tempMax` in the Control Panel's Air Quality settings.

## What does NOT affect the border color

- Window-open state — only marks its own cell (`cell-warning`/`cell-danger`) and adds to `alarmCount` badge.
- Mews reservation alerts (Late Arrival, Overdue) — same, cell/pill-level only, plus badge count.

These affect the bell/alarm badge number (`data.alarmCount`, line 1009: `sensorAlerts + winAgg.openCount + (hasBatteryLow ? 1 : 0)`), not the card border.

## Debugging a specific red room

The service logs a full breakdown to the browser console whenever a room computes `danger`:

```
[RoomData] Room X → DANGER | temp=...(status) hum=...(status) aqi=...(status) noise=...(status) waterLeak=... batteryLow=...
| thresholds: T[warn/danger] H[warn/danger] AQI[warn/danger] Noise[warn/danger]
```

Open DevTools console and find the room's log line to see exactly which factor tripped it.
