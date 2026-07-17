# QA Checklist — Round 2: refresh performance + loading UX

Branch: `audit/hotel-dashboard-fixes`. Round 1 (attribute-collapse, thermostat naming) already passed ✅.
This round covers the **topology cache** (fast refresh) and the **loading skeleton + error banner**.

**Setup:** open DevTools → **Network** and **Console** tabs before loading. In DevTools → **Application → Session Storage**, you'll be able to see the cache entry (`revelton_topology_…`).

---

## SECTION E — Topology cache / refresh speed (the main goal)

> First load discovers devices via the slow 3-wave REST waterfall and saves the layout to sessionStorage. Every **refresh after that** should paint room data from the cache in one wave — noticeably faster.

**First load (cold, no cache yet):**

- [ ] Room cards populate normally (same as before) — nothing regressed
- [ ] In Application → Session Storage, a key `revelton_topology_<hash>` appears after load
- [ ] Console (if debug on) shows `topology cache MISS — running full discovery`

**Refresh (F5) — the important part:**

- [ ] Room cards show their data **noticeably faster** than the first load
- [ ] Console shows `topology cache HIT — fast paint from cache`
- [ ] Network tab: right after refresh you see mostly `values/timeseries` + `values/attributes` calls (the fast paint), NOT a full burst of `relations/info` + `keys/timeseries` first
- [ ] ~2.5s after refresh, a quieter second wave of `relations/info` calls appears (the background reconcile) — this is expected
- [ ] All room data is correct and complete after refresh (battery, temps, states, thermostats — same as Section A last round)

**Correctness of the cache:**

- [ ] Add or remove a device in ThingsBoard, then refresh → within a few seconds the change is reflected (the background reconcile catches it)
- [ ] Open the dashboard for a **different** hotel/dashboard (different datasources) → it does NOT show the previous hotel's rooms (cache is keyed per datasource set)
- [ ] Close the tab entirely and reopen → first load is a cache MISS again (sessionStorage clears on tab close) — this is expected

---

## SECTION F — Loading skeleton

- [ ] On a **cold** first load (clear Session Storage first, or new tab), the grid shows shimmering **placeholder cards** while data loads — not an empty "no datasource" message
- [ ] Once room data arrives, the skeleton is replaced by real room cards
- [ ] The skeleton respects the current theme (looks right in both light and dark mode)
- [ ] A genuinely empty hotel (no rooms configured) eventually shows the normal "no datasource" empty state after ~12s (skeleton doesn't spin forever)

---

## SECTION G — Connection error banner

> Previously, if the backend was unreachable the grid just looked empty. Now a banner should appear.

- [ ] Simulate a failure: in DevTools → Network, set **Offline**, then refresh (or click retry) → a red banner appears: "Cannot reach the server…"
- [ ] The banner has a **Retry** button; setting Network back to Online and clicking Retry recovers and loads the rooms
- [ ] When data is flowing normally, the banner is **not** shown
- [ ] The banner does **not** pop up for a brief transient hiccup once rooms are already on screen (it only shows when there's nothing to display)
- [ ] Banner text is translated when you switch language to Russian

---

## SECTION H — Regression (quick confirm, ~1 min)

- [ ] KPI bar populates correctly on first load
- [ ] Thermostat names still show `TRV-1` / `TRV-2` (round 1 fix intact)
- [ ] Air-quality status colors still react
- [ ] Other Devices panel unchanged
- [ ] Room detail, control panel, historical overlay all open and work
- [ ] No new red errors in the Console

---

## Notes / anything odd

_(device name, room, expected vs. saw)_

-
-
-
