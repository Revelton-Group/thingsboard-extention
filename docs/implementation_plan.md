# Threshold Logic Plan

This document outlines the exact logic that will be used to determine the `NORMAL`, `WARNING`, and `DANGER` (Exceeded) statuses for all environmental sensors based on your `max`, `min`, and `warnGap` settings.

## 1. Single-Limit Sensors (Only MAX limit)
**Applies to:** CO₂, PM2.5, PM10, TVOC, Pressure, Noise

These sensors only care about values getting too high. The logic uses only `max` and `warnGap`.

| Status | Condition |
| :--- | :--- |
| 🟢 **NORMAL** | `Value ≤ (max - warnGap)` |
| 🟡 **WARNING** | `Value > (max - warnGap)` AND `Value < max` |
| 🔴 **DANGER (Exceeded)** | `Value ≥ max` |

*Example (CO₂ with max = 1000, warnGap = 200):*
* **Normal:** 0 - 800 ppm
* **Warning:** 801 - 999 ppm
* **Danger:** 1000+ ppm

---

## 2. Dual-Limit Sensors (Both MIN and MAX limits)
**Applies to:** Temperature, Humidity

These sensors care about values getting either too high OR too low. The `warnGap` is applied symmetrically to both the upper limit and the lower limit.

| Status | Condition |
| :--- | :--- |
| 🟢 **NORMAL** | `Value ≥ min` AND `Value ≤ (max - warnGap)` |
| 🟡 **WARNING** | *(Too Low)* `Value < min` AND `Value ≥ (min - warnGap)` <br><br>OR <br><br>*(Too High)* `Value > (max - warnGap)` AND `Value < max` |
| 🔴 **DANGER (Exceeded)** | `Value < (min - warnGap)` <br><br>OR <br><br>`Value ≥ max` |

*Example (Temperature with min = 18, max = 28, warnGap = 3):*
* **Danger (Too Cold):** Below 15°C
* **Warning (Getting Cold):** 15°C to 17.9°C
* **Normal:** 18°C to 25°C
* **Warning (Getting Hot):** 25.1°C to 27.9°C
* **Danger (Too Hot):** 28°C and above

> [!NOTE]
> The `room-data.service.ts` is already using this exact logic for the room cards on the main dashboard.

## Proposed Changes

### [Control Panel Component]
The Control Panel UI currently only computes its "Current Value" colors and badge statuses using the Single-Limit logic (it ignores `min` limits when deciding to turn the text amber or red).

#### [MODIFY] `control-panel.component.ts`
- Update `getMetricStatus(val, limit, warnGap)` to `getMetricStatus(val, limit, warnGap, minLimit)`.
- Implement the Dual-Limit logic inside this method so the Control Panel UI correctly turns amber/red when temperature or humidity drops too low.
- Update `countWarning` and `countAlert` getters to accurately reflect these lower bounds.
- Update the HTML template to pass `th.minLimit` into `getMetricStatus`.

## Open Questions
> [!IMPORTANT]
> 1. For Temperature and Humidity, does the progress bar also need to show the lower-bound warning zone (amber tint on the left side of the bar)? Or is it enough that the current value number and status badge turn Amber/Red when it drops too low?
> 2. Do you agree with the exact boundary definitions outlined above?
