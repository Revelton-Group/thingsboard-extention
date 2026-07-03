# Implementation Plan: New UI Design for Hotel IoT Dashboard

## Overview

The new design (`Hotel IoT Dashboard UI.zip`) is a high-fidelity redesign of the Revelton Studios hotel IoT dashboard. The design brings a new, tighter dark-theme visual language with updated tokens (Manrope + IBM Plex Mono fonts, `#0d1219` page background, `#5c7cfa` accent color) and several layout changes. The task is to **update the existing Angular codebase** to match this new design as closely as possible, translating the HTML prototype's styling into the existing SCSS + Angular component structure.

---

## What Changes vs. What Stays

| Area | Action |
|---|---|
| Design tokens (colors, radii, spacing, fonts) | **Replace** — new palette is final |
| Header layout & KPI strip | **Update** — new look (thinner, new layout, ring-based occupancy card) |
| Room card (grid card) | **Restyle** — new floating "ROOM N" pill tab, tighter tile padding `7px 3px` |
| Room detail modal | **Restyle** — full-screen overlay, new header (check-in/out blocks, checkout pill), new section layout |
| Indoor Climate (vital cards + sparklines) | **Restyle** — new sparkline interaction (tooltip, guide line), new MIN/AVG/MAX footer, wider card grid |
| Sensors & Control Panel section | **Restyle** — new Air Quality card layout (3-col top row + sub-rows), new thermostat card |
| Control Settings modal | **Restyle** — new left-nav tab layout, room chip picker, threshold gauge cards |
| Historical Data modal | **Restyle** — 4-card grid layout |
| Light/Dark theme toggle | **Update** — simplify to single pill toggle (Daylight/Midnight) |
| Language toggle | **Minor update** — keep Material icon + label + chevron style |
| Angular service logic (data, RPC, ThingsBoard) | **No change** — backend logic stays as-is |

---

## Design Tokens to Apply

### Colors (dark theme — becomes the CSS custom property defaults)
```scss
--bg:        #0d1219;
--panel:     #141b25;
--panel2:    #1a2230;
--inner:     #1e2733;
--border:    #27313f;
--tx:        #e6ecf3;    // primary text (replaces --text)
--t2:        #8b97a8;    // secondary (replaces --text-muted)
--t3:        #5c6675;    // tertiary / muted labels
--accent:    #5c7cfa;    // brand blue (replaces #8b5cf6 purple)
--accentSoft: rgba(92,124,250,.14);
--ok:        #34d399;
--okSoft:    rgba(52,211,153,.13);
--warn:      #f5b54a;
--warnSoft:  rgba(245,181,74,.13);
--alert:     #f87171;
--alertSoft: rgba(248,113,113,.13);
--ringTrack: #27313f;
```

### Light Theme Overrides
```scss
--bg:        #eaeef4;
--panel:     #ffffff;
--panel2:    #f6f8fc;
--inner:     #eef2f8;
--border:    #dde3ec;
--tx:        #1a2230;
--t2:        #5c6675;
--t3:        #9aa6b6;
--accent:    #4361e8;
--accentSoft: rgba(67,97,232,.10);
--ok:        #0e9f6e;
--okSoft:    rgba(14,159,110,.12);
--warn:      #c97a17;
--warnSoft:  rgba(201,122,23,.12);
--alert:     #dc4d4d;
--alertSoft: rgba(220,77,77,.12);
--ringTrack: #dde3ec;
```

### Typography
```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..0">
```
- UI font: **Manrope** (replaces Playfair Display + system-ui)
- Data/numeric font: **IBM Plex Mono** (all metric values, timestamps, room numbers)
- Icon font: **Material Symbols Rounded** (adds to existing Material Icons)

---

## Open Questions

> [!IMPORTANT]
> **Q1 — Theme toggle simplification**: The new design has a single pill toggle (Daylight/Midnight) instead of the current multi-palette dropdown. Should the existing palette selector (purple/ocean/etc.) be removed, or kept hidden and only expose light/dark switching?

> [!IMPORTANT]
> **Q2 — Check-in/out block in Room Detail header**: The new design shows CHECK-IN and CHECK-OUT dates directly in the room detail header. Does this data already flow through `RoomData.reservation.checkIn/checkOut`? (From the architecture doc it appears yes — we just need to surface it in the header.)

> [!IMPORTANT]
> **Q3 — Sparkline interactivity (tooltip + guide)**: The new design adds hover-tracking sparklines with tooltip. The existing codebase uses ECharts for charts. Should sparklines be:
> - (A) Inline SVG sparklines (as in the prototype) — new code, lighter
> - (B) ECharts sparklines with tooltip — reuses existing `revelton-historical-chart` component
>
> Recommendation: **(A) Inline SVG** for the vital cards (small sparklines), keeping ECharts for the full historical modal charts.

> [!WARNING]
> **Q4 — Fonts**: Adding Manrope and IBM Plex Mono requires a Google Fonts link in the widget host page. Since this is a ThingsBoard widget, are external font links already allowed? If not, the fonts must be self-hosted.

---

## Proposed Changes

### Design Token Layer

---

#### [MODIFY] [theme.constants.ts](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/core/models/theme.constants.ts)
Update dark and light palette objects to use the new token values (`--bg #0d1219`, `--accent #5c7cfa`, new `--panel/panel2/inner` structure).

#### [MODIFY] [theme.service.ts](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/core/services/theme.service.ts)
Map new token names (`--tx`, `--t2`, `--t3`, `--panel2`, `--inner`, `--accentSoft`, etc.) in addition to existing variable names for backward compat.

---

### Main Dashboard — Hotel Header + KPI Strip

---

#### [MODIFY] [revelton-hotel.component.html](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component.html)

Key changes:
1. **Header**: Font becomes Manrope 27px/700 for hotel name; address line with `location_on` icon; right side = date/time block + language button + Control Settings button + light/dark pill toggle.
2. **Language toggle**: Simplify to `language` icon + label + `expand_more` chevron (pill style, no flag emoji).
3. **Theme toggle**: Replace multi-palette dropdown with a single pill toggle (accent border/bg when dark, neutral when light), label switches "Daylight" / "Midnight".
4. **KPI strip**: Grid `repeat(auto-fit, minmax(160px, 1fr))`, gap `clamp(9px,0.7vw,14px)`. Each KPI card: flex row, 36×36px icon tile (border-radius 11px) + label/value stack. Occupancy card gets a conic-gradient progress ring (44px, 4px inset disc).
5. **Room grid wrapper**: Wrap cards in a `border: 1px solid var(--border)` + `border-radius: 20px` panel container.

#### [MODIFY] [revelton-hotel.component.scss](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component.scss)

Full restyle to new tokens:
- Root: `font-family: Manrope, system-ui`, `background: var(--bg)`, page padding `clamp(14px,1.6vw,26px) clamp(6px,0.6vw,12px) 48px`
- Remove Playfair Display import dependency
- KPI cards: new border-radius 15px, min-height 66px, icon tile 36×36 radius-11px
- Room grid: `repeat(auto-fill, minmax(min(100%, 260px), 1fr))`, gap `clamp(11px,0.9vw,16px)`
- All status colors → map to `--ok / --warn / --alert` variables

---

### Room Card (Grid Card)

---

#### [MODIFY] [room-card.component.html](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/room-view/room-card.component.html)

1. **Floating ROOM N pill**: `position: absolute; top: -9px; left: 50%; transform: translateX(-50%)` — pill centered on the top border edge
2. **Status dot**: 8×8px dot with `box-shadow: 0 0 0 3px var(--panel2)` ring effect
3. **Alert badge**: Bell icon + count in `--alert` color
4. **Tile grid**: 3×3, gap 6px, tile padding `7px 3px` (3px left/right — compact)
5. **Tile internal**: icon + uppercase label row, value below in IBM Plex Mono

#### [MODIFY] [room-card.component.scss](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/room-view/room-card.component.scss)
- Card: `border-radius: 15px`, `border: 1.5px solid var(--status-border)`, hover `translateY(-3px)` + shadow
- Tile: `border-radius: 10px`, padding `7px 3px`, font IBM Plex Mono 10px/600 for values

---

### Room Detail Panel

---

#### [MODIFY] [room-detail-panel.component.html](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/room-view/room-detail-panel.component.html)

1. **Header**:
   - Bed icon tile (44×44, accent-soft bg) with small colored dot badge (bottom-right)
   - Room number (IBM Plex Mono 13px, t3 color) + room name (clamp 17-21px bold)
   - Guest name + pulsing green "Connected" dot
   - Check-in/Check-out block (two date/label pairs) separated by vertical borders
   - Amber "checkout passed" pill (schedule icon + text) — conditional
   - Close button (38×38px)

2. **Body** — two sections (DOM order matters, CSS `order` used in design):
   - **Sensors & Control Panel** (`order: 1, 2`): Air Quality card, Presence card, Thermostat cards, Noise card, Window card, Water Leak rows, Active Alerts card
   - **Indoor Climate** (`order: 3, 4`): header + 24H/7D/30D toggle + vital cards grid

3. **Vital cards**: Each shows icon+label+status pill header → big value (IBM Plex Mono 30px) → inline SVG sparkline → MIN/AVG/MAX footer

#### [MODIFY] [room-detail-panel.component.scss](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/room-view/room-detail-panel.component.scss)
- Full-screen overlay (not a mat-dialog centered box — keep existing MatDialog but restyle to `width: 100vw; height: 100vh; max-width: none; border-radius: 0`)
- Header: `border-bottom: 1px solid var(--border)`, `background: var(--panel)`
- Sensor grid: `repeat(auto-fit, minmax(300px, 1fr))`
- Vital card grid: `repeat(auto-fit, minmax(210px, 1fr))`

---

### Inline SVG Sparklines (new component)

---

#### [NEW] shared/components/sparkline/sparkline.component.ts
A simple Angular component that:
- Takes `@Input() data: number[]`, `@Input() color: string`, `@Input() id: string`
- Renders an inline SVG polyline + area fill (gradient)
- On `mousemove` over a transparent overlay rect: calculates nearest sample index → emits `@Output() hover: { idx: number } | null`
- Parent (vital card) shows dashed guide line, dot, tooltip positioned above point

This is a new, lightweight component (no ECharts dependency) for the small sparklines inside vital cards.

---

### Control Settings Modal

---

#### [MODIFY] [control-panel.component.html](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/control-panel/control-panel.component.ts)
(Assuming TS drives the template — adjust accordingly)

Key structural changes:
1. **Modal frame**: `max-width: 940px`, `height: min(700px, 92vh)`, `border-radius: 18px`, `overflow: hidden; display: flex; flex-direction: column`
2. **Scope selector bar**: "Applies to" + dropdown button with room count + chip picker dropdown (searchable, 2-col grid)
3. **Left nav**: 212px wide sidebar, nav items with icon + label
4. **Content area**: Flex-1, scrollable, threshold gauge cards (label + icon + bar + stepper)
5. **Footer**: "Applies to N of M rooms" + accent "Save thresholds" button

---

### Historical Data Modal

---

#### [MODIFY] [room-historical-data.component.html](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/room-view/room-historical-data.component.html)

1. Restyle modal frame: `max-width: 1180px`, header with icon + title + 24H/7D/30D toggle + close
2. Body: 4-card grid `repeat(auto-fit, minmax(330px, 1fr))` — Temp/Humidity, CO₂, Noise, Windows

#### [MODIFY] [room-historical-data.component.scss](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/room-view/room-historical-data.component.scss)
Apply new token colors, card border-radius 14px, consistent with new design.

---

### Global SCSS / Font Imports

---

#### [MODIFY] [revelton-hotel.component.scss](file:///home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention/src/app/components/revelton-tb-extension-dashboard/features/hotel-dashboard/revelton-hotel.component.scss)
Add `@import url(...)` for Manrope + IBM Plex Mono (or add via `<link>` in the component's `styleUrls` via `encapsulation: ViewEncapsulation.None`).

Add global base styles:
```scss
*, *::before, *::after { box-sizing: border-box; }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-thumb { background: #3a4655; border-radius: 8px; }
::-webkit-scrollbar-track { background: transparent; }
.ms { font-family: 'Material Symbols Rounded'; ... }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes fadein { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
```

---

## Screenshots for Reference

### Main Dashboard (Room Grid)
![Room Grid](roomgrid.png)

### Room Card Detail
![Room Detail Header](detail-new.png)

### Sensors & Control Panel
![Sensors & Control Panel](01-vitals.png)

### Control Settings Modal
![Control Settings](01-ctrl.png)

---

## Verification Plan

### Build Verification
```bash
cd /home/nurlansarkhanov/Desktop/code/Revelton/thingsboard-extention
yarn build  # or npm run build
```
Build must complete without errors.

### Visual Verification
1. Open the dashboard widget in ThingsBoard
2. **Room grid**: Cards show floating ROOM pill, status dot, compact 3×3 tile grid with IBM Plex Mono values, correct status border colors
3. **KPI strip**: All 6 KPI cards rendered with icon tiles + occupancy ring
4. **Room detail**: Full-screen overlay, header with check-in/out block, sensors section, indoor climate vitals with sparklines
5. **Sparkline hover**: Guide line + tooltip appear on mouse hover over vital cards
6. **Control modal**: Left nav sidebar + threshold cards + room chip picker
7. **Theme toggle**: Switches between Daylight (light) and Midnight (dark) with correct variable values
8. **Language toggle**: EN/RU switch works correctly

### Regression Check
- Thermostat RPC (mode/preset/setpoint) must still work
- MEWS reservation data must still display in room detail header
- Alert badges on room cards must still reflect alert count
- Historical data charts (ECharts) must still render
